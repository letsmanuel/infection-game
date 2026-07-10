import { Players, Workspace } from "@rbxts/services";

const player = Players.LocalPlayer;

function shouldHide(): boolean {
	return player.GetAttribute("role") === "Attacker" || player.GetAttribute("_dead") === true;
}

function hidePrompt(prompt: ProximityPrompt) {
	prompt.Enabled = false;
}

for (const desc of Workspace.GetDescendants()) {
	if (desc.IsA("ProximityPrompt") && shouldHide()) {
		hidePrompt(desc);
	}
}

Workspace.DescendantAdded.Connect((desc) => {
	if (desc.IsA("ProximityPrompt") && shouldHide()) {
		hidePrompt(desc);
	}
});

player.GetAttributeChangedSignal("role").Connect(() => {
	if (!shouldHide()) return;
	for (const desc of Workspace.GetDescendants()) {
		if (desc.IsA("ProximityPrompt")) {
			hidePrompt(desc);
		}
	}
});

player.GetAttributeChangedSignal("_dead").Connect(() => {
	if (!shouldHide()) return;
	for (const desc of Workspace.GetDescendants()) {
		if (desc.IsA("ProximityPrompt")) {
			hidePrompt(desc);
		}
	}
});

print("[hideRevivePrompt] loaded");
