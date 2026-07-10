import { Players, ReplicatedStorage } from "@rbxts/services";

const player = Players.LocalPlayer;

function getScrapLabel(): TextLabel | undefined {
	const playerGui = player.FindFirstChild("PlayerGui") as PlayerGui | undefined;
	if (!playerGui) return;
	const hud = playerGui.FindFirstChild("hud") as ScreenGui | undefined;
	if (!hud) return;
	const scrapFrame = hud.FindFirstChild("scrapAmount") as Frame | undefined;
	if (!scrapFrame) return;
	return scrapFrame.FindFirstChild("TextLabel") as TextLabel | undefined;
}

function getVitaminFrame(): Frame | undefined {
	const playerGui = player.FindFirstChild("PlayerGui") as PlayerGui | undefined;
	if (!playerGui) return;
	const hud = playerGui.FindFirstChild("hud") as ScreenGui | undefined;
	if (!hud) return;
	return hud.FindFirstChild("vitaminAmount") as Frame | undefined;
}

function updateVisibility() {
	const playerGui = player.FindFirstChild("PlayerGui") as PlayerGui | undefined;
	if (!playerGui) return;
	const role = player.GetAttribute("role") as string | undefined;
	const isAttacker = role === "Attacker";

	const scrapFrame = playerGui.FindFirstChild("hud")?.FindFirstChild("scrapAmount") as Frame | undefined;
	if (scrapFrame) scrapFrame.Visible = !isAttacker;

	const vitFrame = getVitaminFrame();
	if (vitFrame) vitFrame.Visible = !isAttacker;
}

function updateLabels() {
	const scrapAmount = ReplicatedStorage.FindFirstChild("ScrapAmount") as IntValue | undefined;
	const vitaminAmount = ReplicatedStorage.FindFirstChild("VitaminAmount") as IntValue | undefined;

	const label = getScrapLabel();
	if (label && scrapAmount) label.Text = `Scrap: ${scrapAmount.Value}`;

	const vitFrame = getVitaminFrame();
	if (vitFrame && vitaminAmount) {
		const vitLabel = vitFrame.FindFirstChild("TextLabel") as TextLabel | undefined;
		if (vitLabel) vitLabel.Text = `Adrenaline: ${vitaminAmount.Value}`;
	}
}

function connectValueListener(name: string) {
	const existing = ReplicatedStorage.FindFirstChild(name) as IntValue | undefined;
	if (existing) {
		existing.Changed.Connect(() => updateLabels());
		return;
	}
	const conn = ReplicatedStorage.ChildAdded.Connect((child) => {
		if (child.Name === name) {
			(child as IntValue).Changed.Connect(() => updateLabels());
			conn.Disconnect();
		}
	});
}

connectValueListener("ScrapAmount");
connectValueListener("VitaminAmount");

player.GetAttributeChangedSignal("role").Connect(() => updateVisibility());

updateLabels();
updateVisibility();

print("[lootUI] loaded");
