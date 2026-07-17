import { Workspace } from "@rbxts/services";

const folder = Workspace.WaitForChild("aiCollisions") as Folder;

function disableCollision(instance: Instance) {
	if (instance.IsA("BasePart")) {
		instance.CanCollide = false;
	}
	for (const child of instance.GetDescendants()) {
		if (child.IsA("BasePart")) {
			child.CanCollide = false;
		}
	}
}

for (const child of folder.GetChildren()) {
	disableCollision(child);
}

folder.ChildAdded.Connect((child) => {
	disableCollision(child);
});

print("[AICollisions] Client-side collision disabled on all aiCollision parts");
