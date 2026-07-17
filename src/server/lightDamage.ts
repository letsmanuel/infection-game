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

task.spawn(() => {
	while (true) {
		task.wait(5);
		lightParts = getLightParts();
		print(`[LightDamage] Refreshed: ${lightParts.size()} light zone parts`);
	}
});
print(`[LightDamage] Found ${lightParts.size()} light zone parts`);
for (const lp of lightParts) {
	print(`[LightDamage]   - ${lp.GetFullName()}`);
}

function getAIRigs(): Model[] {
	const rigs: Model[] = [];
	for (const child of Workspace.GetChildren()) {
		if (child.GetAttribute("isAI") === true && child.IsA("Model")) {
			rigs.push(child);
		}
	}
	return rigs;
}

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

let debugTick = 0;

task.spawn(() => {
	while (true) {
		debugTick++;

		if (!isPowerOutageActive()) {
			let damagedAnyone = false;

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
						damagedAnyone = true;
						break;
					}
				}
			}

			for (const rig of getAIRigs()) {
				const aiHumanoid = rig.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
				if (!aiHumanoid || aiHumanoid.Health <= 0) continue;

				for (const lightPart of lightParts) {
					if (isInsideLightZone(rig, lightPart)) {
						aiHumanoid.Health -= DAMAGE;
						damagedAnyone = true;
						break;
					}
				}
			}

			if (damagedAnyone && debugTick % 5 === 0) {
				print(`[LightDamage] Dealt light damage this tick`);
			}
		}

		if (debugTick % 25 === 0) {
			const playerAttackers = Players.GetPlayers().filter((p) => p.GetAttribute("role") === "Attacker").size();
			const aiCount = getAIRigs().size();
			const outage = isPowerOutageActive();
			print(`[LightDamage] tick=${debugTick} lightZones=${lightParts.size()} humanAttackers=${playerAttackers} aiMonsters=${aiCount} outageActive=${outage}`);
		}

		task.wait(TICK_INTERVAL);
	}
});

print("Light damage system loaded!");
