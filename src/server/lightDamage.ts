import { Players, Workspace } from "@rbxts/services";
import { isPowerOutageActive } from "server/gameState";

const DAMAGE = 5;
const TICK_INTERVAL = 0.2;
const OVERLAP_PARAMS = new OverlapParams();
OVERLAP_PARAMS.FilterType = Enum.RaycastFilterType.Include;

function getLightParts(): BasePart[] {
	const triggerZones = Workspace.FindFirstChild("TriggerZones") as Folder | undefined;
	if (!triggerZones) return [];

	const lightFolder = triggerZones.FindFirstChild("Light") as Folder | undefined;
	if (!lightFolder) return [];

	const parts: BasePart[] = [];
	for (const child of lightFolder.GetDescendants()) {
		if (child.IsA("BasePart")) {
			parts.push(child);
		}
	}
	return parts;
}

let lightParts = getLightParts();
print(`[LightDamage] Found ${lightParts.size()} light zone parts`);

function isInsideLightZone(char: Model, lightPart: BasePart): boolean {
	const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!root) return false;

	const overlaps = Workspace.GetPartsInPart(lightPart, OVERLAP_PARAMS);
	for (const part of overlaps) {
		if (part.IsDescendantOf(char)) {
			return true;
		}
	}
	return false;
}

task.spawn(() => {
	while (true) {
		if (!isPowerOutageActive()) {
			for (const player of Players.GetPlayers()) {
				const role = player.GetAttribute("role") as string | undefined;
				if (role !== "Attacker") continue;

				const char = player.Character;
				if (!char) continue;

				const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
				if (!humanoid || humanoid.Health <= 0) continue;

				for (const lightPart of lightParts) {
					if (isInsideLightZone(char, lightPart)) {
						humanoid.Health -= DAMAGE;
						break;
					}
				}
			}
		}
		task.wait(TICK_INTERVAL);
	}
});

print("Light damage system loaded!");
