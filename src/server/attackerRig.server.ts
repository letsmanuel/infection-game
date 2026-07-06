import { Players, Workspace, ServerStorage } from "@rbxts/services";

const RIG_MODEL_NAME = "playercontrolledRig";
const HIDE_POSITION = new Vector3(-90.54, 0.5, 222.46);

function disableRealCharacter(character: Model) {
	const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
	if (humanoid) {
		humanoid.WalkSpeed = 0;
		humanoid.JumpPower = 0;
		humanoid.PlatformStand = true;
	}

	const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (root) {
		root.CFrame = new CFrame(HIDE_POSITION);
		root.Anchored = true;
	}

	for (const child of character.GetDescendants()) {
		if (child.IsA("BasePart")) {
			child.Transparency = 1;
		}
	}
}

function spawnRigForPlayer(player: Player) {
	const existingRig = findPlayerRig(player);
	if (existingRig) existingRig.Destroy();

	const character = player.Character;
	if (!character) return;

	const rigTemplate = ServerStorage.FindFirstChild(RIG_MODEL_NAME) as Model | undefined;
	if (!rigTemplate) {
		warn(`Rig template "${RIG_MODEL_NAME}" not found in ServerStorage`);
		return;
	}

	const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!root) return;

	const rig = rigTemplate.Clone();
	rig.Name = `${player.Name}_Rig`;
	rig.Parent = Workspace;
	rig.SetAttribute("controlledBy", player.UserId);

	const rigRoot = rig.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (rigRoot) {
		rigRoot.CFrame = root.CFrame;
		rigRoot.Anchored = false;
		rigRoot.SetNetworkOwner(player);
	}

	const rigHumanoid = rig.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
	if (rigHumanoid) {
		rigHumanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
	}

	disableRealCharacter(character);
}

function findPlayerRig(player: Player): Model | undefined {
	for (const child of Workspace.GetChildren()) {
		if (child.GetAttribute("controlledBy") === player.UserId && (child.IsA("Model") || child.IsA("BasePart"))) {
			return child as Model;
		}
	}
	return undefined;
}

function cleanupRig(player: Player) {
	const rig = findPlayerRig(player);
	if (rig) rig.Destroy();
}

Players.PlayerAdded.Connect((player) => {
	player.GetAttributeChangedSignal("role").Connect(() => {
		const role = player.GetAttribute("role") as string | undefined;
		if (role === "Attacker") {
			spawnRigForPlayer(player);
		}
	});

	player.CharacterAdded.Connect((character) => {
		const role = player.GetAttribute("role") as string | undefined;
		if (role === "Attacker") {
			spawnRigForPlayer(player);
		}
	});
});

Players.PlayerRemoving.Connect((player) => {
	cleanupRig(player);
});

print("Attacker rig server module loaded!");
