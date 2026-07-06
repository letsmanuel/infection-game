// server/PickupServer.ts
import { Players, RunService, ServerStorage, Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const pickupRemote = Remotes.Server.Get("pickupObject");
const dropRemote = Remotes.Server.Get("dropObject");
const interactRemote = Remotes.Server.Get("interactObject");
const heldChangedRemote = Remotes.Server.Get("objectHeldChanged");
const confirmRemote = Remotes.Server.Get("confirmPlace");
const cancelRemote = Remotes.Server.Get("cancelPlace");
const placeGhostChanged = Remotes.Server.Get("placeGhostChanged");

const MAX_PICKUP_DISTANCE = 12;
const BASE_WALK_SPEED = 16;
const BASE_MOUSE_SENSITIVITY_SCALE = 1;
const SENSITIVITY_REDUCTION_PER_WEIGHT = 0.015;
const MIN_SENSITIVITY_SCALE = 0.3;
const MIN_WALK_SPEED = 2;

const HOLD_DISTANCE = 5;
const HOLD_HEIGHT_OFFSET = -0.5;
const PLACE_MAX_DISTANCE = 10;

interface HeldState {
    target: Instance;
    weight: number;
    originalCollision: Map<BasePart, boolean>;
}

const heldByPlayer = new Map<Player, HeldState>();
const holderOfObject = new Map<Instance, Player>();
const placeGhosts = new Map<Player, Instance>();

const placedFolder = (() => {
    let folder = Workspace.FindFirstChild("PlacedObjects") as Folder | undefined;
    if (!folder) {
        folder = new Instance("Folder");
        folder.Name = "PlacedObjects";
        folder.Parent = Workspace;
    }
    return folder;
})();

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
        if (part.Parent) part.CanCollide = canCollide;
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
        if (placeGhosts.has(player)) continue;

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

    if (player.GetAttribute("role") === "Attacker") return;

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
    if (placeGhosts.has(player)) return;
    dropCurrentlyHeld(player);
});

function endPlaceMode(player: Player, keepGhost: boolean) {
    const ghost = placeGhosts.get(player);
    if (!ghost) return;

    placeGhosts.delete(player);

    if (!keepGhost) {
        ghost.Destroy();
    }
}

interactRemote.Connect((player) => {
    if (placeGhosts.has(player)) return;
    const state = heldByPlayer.get(player);
    if (!state) return;

    const productId = state.target.GetAttribute("productId") as string | undefined;
    if (!productId) return;

    const productsFolder = ServerStorage.FindFirstChild("Products") as Folder | undefined;
    if (!productsFolder) return;
    const productModel = productsFolder.FindFirstChild(productId);
    if (!productModel) return;

    if (!(productModel.IsA("BasePart") || productModel.IsA("Model"))) return;

    const character = player.Character;
    if (!character) return;
    const rootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
    if (!rootPart) return;

    const origin = rootPart.Position;
    const raycast = Workspace.Raycast(origin, new Vector3(0, -200, 0));
    const groundPos = raycast ? raycast.Position : origin.add(new Vector3(0, -3, 0));
    const clampedPos = new Vector3(origin.X, groundPos.Y, origin.Z);
    const dist = origin.sub(clampedPos).Magnitude;
    const placePos = dist > PLACE_MAX_DISTANCE
        ? origin.add(new Vector3(0, -3, 0))
        : clampedPos;

    const ghost = productModel.Clone();
    ghost.Name = `${productId}_Ghost`;
    ghost.Parent = Workspace;
    ghost.SetAttribute("placed", false);
    ghost.SetAttribute("_productId", productId);

    const setupPart = (part: BasePart) => {
        const wasAnchored = part.Anchored;
        if (wasAnchored) part.Anchored = false;
        part.SetNetworkOwner(player);
        part.Anchored = true;
        part.CanCollide = false;
        if (part.Transparency < 0.7) {
            part.Transparency = math.min(0.7, part.Transparency + 0.5);
        }
    };
    if (ghost.IsA("BasePart")) setupPart(ghost);
    for (const child of ghost.GetDescendants()) {
        if (child.IsA("BasePart")) setupPart(child);
    }

    if (ghost.IsA("BasePart")) {
        ghost.CFrame = new CFrame(placePos).add(new Vector3(0, ghost.Size.Y / 2, 0));
    } else if (ghost.IsA("Model")) {
        const primary = ghost.PrimaryPart ?? ghost.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
        if (primary) {
            ghost.PrimaryPart = primary;
            ghost.SetPrimaryPartCFrame(new CFrame(placePos).add(new Vector3(0, primary.Size.Y / 2, 0)));
        }
    }

    placeGhosts.set(player, ghost);
    placeGhostChanged.SendToAllPlayers(ghost, player);
});

confirmRemote.Connect((player, confirmCFrame) => {
    const state = heldByPlayer.get(player);
    const ghost = placeGhosts.get(player);
    if (!state || !ghost) return;

    const productId = ghost.GetAttribute("_productId") as string | undefined;
    if (!productId) return;

    const productsFolder = ServerStorage.FindFirstChild("Products") as Folder | undefined;
    if (!productsFolder) return;
    const productModel = productsFolder.FindFirstChild(productId);
    if (!productModel || !(productModel.IsA("BasePart") || productModel.IsA("Model"))) return;

    ghost.Destroy();
    placeGhosts.delete(player);

    const placed = productModel.Clone();
    placed.Parent = placedFolder;
    placed.SetAttribute("placed", true);

    for (const child of placed.GetDescendants()) {
        if (child.IsA("Highlight")) child.Destroy();
    }
    const rootHighlight = placed.FindFirstChildWhichIsA("Highlight");
    if (rootHighlight) rootHighlight.Destroy();

    if (placed.IsA("BasePart")) {
        placed.Anchored = true;
        placed.CFrame = confirmCFrame;
    } else if (placed.IsA("Model")) {
        const primary = placed.PrimaryPart ?? placed.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
        if (primary) {
            placed.PrimaryPart = primary;
            for (const child of placed.GetDescendants()) {
                if (child.IsA("BasePart")) {
                    child.Anchored = true;
                }
            }
            placed.SetPrimaryPartCFrame(confirmCFrame);
        }
    }

    heldByPlayer.delete(player);
    holderOfObject.delete(state.target);
    restoreCollision(state.originalCollision);
    clearCarryPenalty(player);

    const part = getBasePart(state.target);
    if (part) part.SetAttribute("_heldBy", undefined);
    state.target.Destroy();

    heldChangedRemote.SendToAllPlayers(player, undefined);
    placeGhostChanged.SendToAllPlayers(undefined, player);
});

cancelRemote.Connect((player) => {
    if (!placeGhosts.has(player)) return;
    endPlaceMode(player, false);
    placeGhostChanged.SendToAllPlayers(undefined, player);
});

Players.PlayerRemoving.Connect((player) => {
    dropCurrentlyHeld(player);
    endPlaceMode(player, false);
});

print("Pickup/drag server module loaded!");
