// server/PickupServer.ts
import { Players, RunService } from "@rbxts/services";
import Remotes from "shared/remotes";

const pickupRemote = Remotes.Server.Get("pickupObject");
const dropRemote = Remotes.Server.Get("dropObject");
const interactRemote = Remotes.Server.Get("interactObject");
const heldChangedRemote = Remotes.Server.Get("objectHeldChanged");

const MAX_PICKUP_DISTANCE = 12;
const BASE_WALK_SPEED = 16;
const BASE_MOUSE_SENSITIVITY_SCALE = 1;
const SENSITIVITY_REDUCTION_PER_WEIGHT = 0.015;
const MIN_SENSITIVITY_SCALE = 0.3;
const MIN_WALK_SPEED = 2;

const HOLD_DISTANCE = 5;
const HOLD_HEIGHT_OFFSET = -0.5;

interface HeldState {
    target: Instance;
    weight: number;
    originalCollision: Map<BasePart, boolean>;
}

const heldByPlayer = new Map<Player, HeldState>();
const holderOfObject = new Map<Instance, Player>();

function getHumanoid(player: Player): Humanoid | undefined {
    const character = player.Character;
    if (!character) return undefined;
    return character.FindFirstChildOfClass("Humanoid");
}

function getAllParts(root: Instance): BasePart[] {
    const parts: BasePart[] = [];
    if (root.IsA("BasePart")) parts.push(root);
    for (const child of root.GetDescendants()) {
        if (child.IsA("BasePart")) parts.push(child);
    }
    return parts;
}

function disableCollision(root: Instance): Map<BasePart, boolean> {
    const saved = new Map<BasePart, boolean>();
    for (const part of getAllParts(root)) {
        saved.set(part, part.CanCollide);
        part.CanCollide = false;
    }
    return saved;
}

function restoreCollision(saved: Map<BasePart, boolean>) {
    for (const [part, canCollide] of saved) {
        part.CanCollide = canCollide;
    }
}

function getBasePart(target: Instance): BasePart | undefined {
    if (target.IsA("BasePart")) return target;
    if (target.IsA("Model")) return target.PrimaryPart ?? (target.FindFirstChildWhichIsA("BasePart") as BasePart | undefined);
    return undefined;
}

function applyCarryPenalty(player: Player, weight: number) {
    const humanoid = getHumanoid(player);
    if (!humanoid) return;

    const newSpeed = math.max(MIN_WALK_SPEED, BASE_WALK_SPEED - weight);
    humanoid.WalkSpeed = newSpeed;

    const sensitivityScale = math.max(
        MIN_SENSITIVITY_SCALE,
        BASE_MOUSE_SENSITIVITY_SCALE - weight * SENSITIVITY_REDUCTION_PER_WEIGHT,
    );
    player.SetAttribute("_carrySensitivityScale", sensitivityScale);
}

function clearCarryPenalty(player: Player) {
    const humanoid = getHumanoid(player);
    if (humanoid) {
        humanoid.WalkSpeed = BASE_WALK_SPEED;
    }
    player.SetAttribute("_carrySensitivityScale", 1);
}

RunService.Heartbeat.Connect(() => {
    for (const [player, state] of heldByPlayer) {
        const character = player.Character;
        if (!character) continue;
        const rootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!rootPart) continue;

        const part = getBasePart(state.target);
        if (!part) continue;

        const targetCFrame = rootPart.CFrame.mul(
            new CFrame(new Vector3(0, HOLD_HEIGHT_OFFSET, -HOLD_DISTANCE)),
        );
        part.CFrame = targetCFrame;
    }
});

function dropCurrentlyHeld(player: Player) {
    const state = heldByPlayer.get(player);
    if (!state) return;

    heldByPlayer.delete(player);
    holderOfObject.delete(state.target);

    restoreCollision(state.originalCollision);

    const part = getBasePart(state.target);
    if (part) {
        part.SetAttribute("_heldBy", undefined);
        part.Anchored = false;
    }

    clearCarryPenalty(player);
    heldChangedRemote.SendToAllPlayers(player, undefined);
}

pickupRemote.Connect((player, target) => {
    if (heldByPlayer.has(player)) return;

    if (holderOfObject.has(target)) return;

    if (target.GetAttribute("pickupable") !== true) return;

    const character = player.Character;
    const humanoid = getHumanoid(player);
    const rootPart = character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!character || !humanoid || !rootPart) return;

    const part = getBasePart(target);
    if (!part) return;

    const distance = rootPart.Position.sub(part.Position).Magnitude;
    if (distance > MAX_PICKUP_DISTANCE) return;

    const weight = target.GetAttribute("weight");
    const numericWeight = typeIs(weight, "number") ? weight : 0;

    const originalCollision = disableCollision(target);

    heldByPlayer.set(player, { target, weight: numericWeight, originalCollision });
    holderOfObject.set(target, player);

    part.SetAttribute("_heldBy", player.UserId);
    part.SetNetworkOwner(player);
    part.Anchored = true;

    applyCarryPenalty(player, numericWeight);

    heldChangedRemote.SendToAllPlayers(player, target);
});

dropRemote.Connect((player) => {
    dropCurrentlyHeld(player);
});

interactRemote.Connect((player) => {
    const state = heldByPlayer.get(player);
    if (!state) return;

    state.target.SetAttribute("interacted", true);
});

Players.PlayerRemoving.Connect((player) => {
    dropCurrentlyHeld(player);
});

print("Pickup/drag server module loaded!");