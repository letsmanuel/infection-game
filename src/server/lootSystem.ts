import { Players, Workspace, ServerStorage, ReplicatedStorage, RunService } from "@rbxts/services";

const SPOT_FOLDER_NAME = "PossibleItemLocations";
const REGEN_INTERVAL = 60;
const EMPTY_THRESHOLD = 10;
const SPAWNED_ITEMS_NAME = "SpawnedItems";

function getSpawnedItemsFolder(): Folder {
	const folder = Workspace.FindFirstChild(SPAWNED_ITEMS_NAME) as Folder | undefined;
	if (folder) return folder;
	const f = new Instance("Folder");
	f.Name = SPAWNED_ITEMS_NAME;
	f.Parent = Workspace;
	return f;
}

function spawnScrapModel(position: Vector3): Model | undefined {
	const scrapFolder = ServerStorage.FindFirstChild("ScrapAssets") as Folder | undefined;
	if (!scrapFolder) return;

	const models: Model[] = [];
	for (const child of scrapFolder.GetChildren()) {
		if (child.IsA("Model")) {
			models.push(child);
		}
	}
	if (models.size() === 0) return;

	const template = models[math.random(0, models.size() - 1)];
	const clone = template.Clone();
	clone.Parent = getSpawnedItemsFolder();

	const attachment = clone.FindFirstChild("Attachment") as Attachment | undefined;
	if (attachment) {
		clone.PivotTo(new CFrame(position));
	} else {
		clone.MoveTo(position);
	}
	return clone;
}

function removeScrapModel(model: Model) {
	const primaryPart = model.PrimaryPart ?? (model.FindFirstChild("HumanoidRootPart") as BasePart | undefined);
	if (!primaryPart) {
		model.Destroy();
		return;
	}

	const startY = primaryPart.Position.Y;
	const targetY = startY - 10;
	const duration = 1.5;
	let elapsed = 0;

	const conn = RunService.Heartbeat.Connect((dt) => {
		elapsed += dt;
		const t = math.min(1, elapsed / duration);
		const y = startY + (targetY - startY) * t;
		primaryPart.CFrame = new CFrame(primaryPart.Position.X, y, primaryPart.Position.Z);
		if (t >= 1) {
			conn.Disconnect();
			model.Destroy();
		}
	});
}

function getOrCreateIntValue(name: string): IntValue {
	const existing = ReplicatedStorage.FindFirstChild(name) as IntValue | undefined;
	if (existing) return existing;

	const iv = new Instance("IntValue");
	iv.Name = name;
	iv.Value = 0;
	iv.Parent = ReplicatedStorage;
	return iv;
}

const scrapAmount = getOrCreateIntValue("ScrapAmount");
const vitaminAmount = getOrCreateIntValue("VitaminAmount");

function getSpotParts(): BasePart[] {
	const folder = Workspace.FindFirstChild(SPOT_FOLDER_NAME) as Folder | undefined;
	if (!folder) {
		warn("[LootSystem] PossibleItemLocations folder not found");
		return [];
	}
	const parts: BasePart[] = [];
	for (const child of folder.GetChildren()) {
		if (child.IsA("BasePart")) {
			parts.push(child);
		}
	}
	return parts;
}

type SpotState = "Scrap" | "Vitamin" | "Empty";

function rollSpot(): SpotState {
	const roll = math.random(1, 100);
	if (roll <= 60) return "Scrap";
	if (roll <= 65) return "Vitamin";
	return "Empty";
}

function createPrompt(part: BasePart, state: SpotState): ProximityPrompt {
	const prompt = new Instance("ProximityPrompt");
	prompt.ActionText = state === "Scrap" ? "Collect Scrap" : "Collect Adrenaline";
	prompt.ObjectText = state === "Scrap" ? "Scrap" : "Adrenaline";
	prompt.HoldDuration = state === "Scrap" ? 0.5 : 3;
	prompt.MaxActivationDistance = 8;
	prompt.RequiresLineOfSight = false;
	prompt.Parent = part;
	return prompt;
}

const spots = getSpotParts();
const spotState = new Map<BasePart, SpotState>();
const spotPrompts = new Map<BasePart, ProximityPrompt>();
const spotScrapModels = new Map<BasePart, Model>();
const spotTimers = new Map<BasePart, number>();
let emptyCount = 0;

function updateEmptyCount() {
	emptyCount = 0;
	for (const [, state] of spotState) {
		if (state === "Empty") emptyCount++;
	}
}

for (const part of spots) {
	const state = rollSpot();
	spotState.set(part, state);

		if (state !== "Empty") {
			const prompt = createPrompt(part, state);
			spotPrompts.set(part, prompt);

			if (state === "Scrap") {
				const model = spawnScrapModel(part.Position);
				if (model) spotScrapModels.set(part, model);
			}

			prompt.Triggered.Connect((player) => {
				const role = player.GetAttribute("role") as string | undefined;
				if (role === "Attacker") return;
				const currentState = spotState.get(part);
				if (currentState === undefined || currentState === "Empty") return;

				if (currentState === "Scrap") {
					scrapAmount.Value += 1;
					const model = spotScrapModels.get(part);
					if (model) removeScrapModel(model);
					spotScrapModels.delete(part);
				} else {
					vitaminAmount.Value += 1;
				}

			spotState.set(part, "Empty");
			prompt.Destroy();
			spotPrompts.delete(part);
			updateEmptyCount();

			spotTimers.set(part, 0);
		});
	} else {
		updateEmptyCount();
	}
}

print(`[LootSystem] ${spots.size()} spots initialized. Empty: ${emptyCount}`);

RunService.Heartbeat.Connect((dt) => {
	for (const [part, state] of spotState) {
		if (state !== "Empty") continue;

		const timer = (spotTimers.get(part) ?? 0) + dt;
		spotTimers.set(part, timer);

		if (timer >= REGEN_INTERVAL) {
			if (emptyCount >= EMPTY_THRESHOLD) {
				const newState = rollSpot();
				spotState.set(part, newState);

				if (newState !== "Empty") {
					const prompt = createPrompt(part, newState);
					spotPrompts.set(part, prompt);

					if (newState === "Scrap") {
						const model = spawnScrapModel(part.Position);
						if (model) spotScrapModels.set(part, model);
					}

					prompt.Triggered.Connect((player) => {
						const role = player.GetAttribute("role") as string | undefined;
						if (role === "Attacker") return;
						const currentState = spotState.get(part);
						if (currentState === undefined || currentState === "Empty") return;

						if (currentState === "Scrap") {
							scrapAmount.Value += 1;
							const model = spotScrapModels.get(part);
							if (model) removeScrapModel(model);
							spotScrapModels.delete(part);
						} else {
							vitaminAmount.Value += 1;
						}

						spotState.set(part, "Empty");
						prompt.Destroy();
						spotPrompts.delete(part);
						updateEmptyCount();

						spotTimers.set(part, 0);
					});
				}
				updateEmptyCount();
			}
			spotTimers.set(part, 0);
		}
	}
});

print("Loot system loaded!");
