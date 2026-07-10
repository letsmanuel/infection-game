import { Players, Workspace, ReplicatedStorage } from "@rbxts/services";

const FAST_BASE = 8;
const FAST_MULT = 2;
const RESPAWN_DURATION = 0.5;

const deathCounts = new Map<Player, number>();
const adrenalinePrompts = new Map<Player, ProximityPrompt>();

function getOrCreateIntValue(name: string): IntValue {
	const existing = ReplicatedStorage.FindFirstChild(name) as IntValue | undefined;
	if (existing) return existing;
	const iv = new Instance("IntValue");
	iv.Name = name;
	iv.Value = 0;
	iv.Parent = ReplicatedStorage;
	return iv;
}

const vitaminAmount = getOrCreateIntValue("VitaminAmount");

function createNormalPrompt(character: Model, head: BasePart): ProximityPrompt {
	const prompt = new Instance("ProximityPrompt");
	prompt.ActionText = "Revive";
	prompt.ObjectText = "Dead Player";
	prompt.HoldDuration = math.random(25, 35);
	prompt.RequiresLineOfSight = false;
	prompt.MaxActivationDistance = 8;
	prompt.KeyboardKeyCode = Enum.KeyCode.E;
	prompt.Parent = head;
	return prompt;
}

function createAdrenalinePrompt(player: Player, character: Model, upperTorso: BasePart, deathCount: number): ProximityPrompt {
	const prompt = new Instance("ProximityPrompt");
	prompt.ActionText = "Revive (Adrenaline)";
	prompt.ObjectText = "Dead Player";
	prompt.HoldDuration = FAST_BASE + (deathCount - 1) * FAST_MULT;
	prompt.RequiresLineOfSight = false;
	prompt.MaxActivationDistance = 8;
	prompt.KeyboardKeyCode = Enum.KeyCode.R;
	prompt.Parent = upperTorso;

	if (vitaminAmount.Value <= 0) {
		prompt.Enabled = false;
	}

	adrenalinePrompts.set(player, prompt);
	return prompt;
}

function revivePlayer(deadPlayer: Player, character: Model, reviver: Player, fast: boolean) {
	if (reviver === deadPlayer) return;

	if (fast) {
		if (vitaminAmount.Value <= 0) return;
		vitaminAmount.Value -= 1;
	}

	const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	const deathPosition = root ? root.Position : new Vector3(0, 0, 0);

	const prompts = character.GetChildren().filter(c => c.IsA("ProximityPrompt"));
	for (const p of prompts) p.Destroy();
	adrenalinePrompts.delete(deadPlayer);

	character.Destroy();
	deadPlayer.LoadCharacter();

	const newChar = deadPlayer.Character ?? deadPlayer.CharacterAdded.Wait()[0];
	const newRoot = newChar.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (newRoot) {
		newRoot.CFrame = new CFrame(deathPosition);
	}

	setupCharacter(deadPlayer, newChar);
	deadPlayer.SetAttribute("_dead", false);
	deadPlayer.SetAttribute("_cameraYOffset", undefined);
}

function updateAdrenalinePrompts() {
	for (const [, prompt] of adrenalinePrompts) {
		if (prompt.Parent) {
			prompt.Enabled = vitaminAmount.Value > 0;
		}
	}
}

vitaminAmount.Changed.Connect(() => {
	updateAdrenalinePrompts();
});

function setupCharacter(player: Player, character: Model) {
	const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
	if (!humanoid) return;

	humanoid.BreakJointsOnDeath = false;

	humanoid.Died.Connect(() => {
		const role = player.GetAttribute("role") as string | undefined;
		if (role !== "Runner") return;

		const currentDeaths = (deathCounts.get(player) ?? 0) + 1;
		deathCounts.set(player, currentDeaths);

		player.SetAttribute("_dead", true);

		const head = character.FindFirstChild("Head") as BasePart | undefined;
		if (head) {
			const normalPrompt = createNormalPrompt(character, head);
			normalPrompt.Triggered.Connect((reviver) => {
				revivePlayer(player, character, reviver, false);
			});
		}

		const upperTorso = character.FindFirstChild("UpperTorso") as BasePart | undefined;
		if (upperTorso) {
			const adrenalinePrompt = createAdrenalinePrompt(player, character, upperTorso, currentDeaths);
			adrenalinePrompt.Triggered.Connect((reviver) => {
				revivePlayer(player, character, reviver, true);
			});
		}

		task.wait(RESPAWN_DURATION);

		const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (root && player.GetAttribute("_dead") === true) {
			root.Anchored = true;
		}
	});
}

Players.PlayerAdded.Connect((player) => {
	player.CharacterAdded.Connect((character) => {
		setupCharacter(player, character);
	});

	if (player.Character) {
		setupCharacter(player, player.Character);
	}
});

print("Runner death system loaded!");
