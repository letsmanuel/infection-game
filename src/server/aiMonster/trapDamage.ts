import { Workspace, RunService, SoundService } from "@rbxts/services";

const DAMAGE_AMOUNT = 30;
const DAMAGE_COOLDOWN = 3;
const STUN_DURATION = 4;
const CHECK_INTERVAL = 0.25;

const HURT_PITCH_MIN = 0.9;
const HURT_PITCH_MAX = 1.1;

const recentlyDamaged = new Map<Humanoid, number>();

function playHurtSound() {
	const folder = SoundService.FindFirstChild("HurtEffect") as Folder | undefined;
	if (!folder) return;

	const sounds = folder.GetChildren().filter((c): c is Sound => c.IsA("Sound"));
	if (sounds.size() === 0) return;

	const sound = sounds[math.random(0, sounds.size() - 1)];
	sound.PlaybackSpeed = HURT_PITCH_MIN + math.random() * (HURT_PITCH_MAX - HURT_PITCH_MIN);
	sound.Play();
}

function getTrapHitboxes(): BasePart[] {
	const placedFolder = Workspace.FindFirstChild("PlacedObjects") as Folder | undefined;
	if (!placedFolder) return [];

	const hitboxes: BasePart[] = [];
	for (const child of placedFolder.GetDescendants()) {
		if (child.Name === "HitBox" && child.IsA("BasePart")) {
			hitboxes.push(child);
		}
	}
	return hitboxes;
}

function getAICharacters(): Model[] {
	const chars: Model[] = [];
	for (const child of Workspace.GetChildren()) {
		if (child.GetAttribute("isAI") === true && child.IsA("Model")) {
			chars.push(child);
		}
	}
	return chars;
}

const overlapParams = new OverlapParams();
overlapParams.FilterType = Enum.RaycastFilterType.Include;

RunService.Heartbeat.Connect(() => {
	const hitboxes = getTrapHitboxes();
	if (hitboxes.size() === 0) return;

	const aiChars = getAICharacters();
	if (aiChars.size() === 0) return;

	for (const hitbox of hitboxes) {
		if (!hitbox.Parent) continue;

		const overlaps = Workspace.GetPartsInPart(hitbox, overlapParams);

		for (const part of overlaps) {
			const char = aiChars.find((c) => part.IsDescendantOf(c));
			if (!char) continue;

			const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
			if (!humanoid || humanoid.Health <= 0) continue;

			const now = os.clock();
			const lastHit = recentlyDamaged.get(humanoid);
			if (lastHit !== undefined && now - lastHit < DAMAGE_COOLDOWN) continue;

			humanoid.Health -= DAMAGE_AMOUNT;
			recentlyDamaged.set(humanoid, now);

			playHurtSound();

			char.SetAttribute("_stunned", true);
			humanoid.WalkSpeed = 2;

			task.delay(STUN_DURATION, () => {
				if (char.Parent !== undefined && humanoid.Health > 0) {
					char.SetAttribute("_stunned", false);
				}
			});

			break;
		}
	}
});

print("[TrapDamage] AI trap damage system loaded");
