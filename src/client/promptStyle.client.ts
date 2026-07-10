import { Workspace } from "@rbxts/services";

function stylePrompt(prompt: ProximityPrompt) {
	prompt.Style = Enum.ProximityPromptStyle.Custom;
}

for (const desc of Workspace.GetDescendants()) {
	if (desc.IsA("ProximityPrompt")) {
		stylePrompt(desc);
	}
}

Workspace.DescendantAdded.Connect((desc) => {
	if (desc.IsA("ProximityPrompt")) {
		stylePrompt(desc);
	}
});

print("[promptStyle] loaded");
