import { Players, Workspace } from "@rbxts/services";

function getRandomSpawnPosition(folder: Folder): Vector3 | undefined {
	const parts = new Array<BasePart>();
	for (const child of folder.GetChildren()) {
		if (child.IsA("BasePart")) {
			parts.push(child);
		}
	}
	if (parts.size() === 0) return undefined;

	const part = parts[math.random(0, parts.size() - 1)];
	const cf = part.CFrame;
	const halfSize = part.Size.div(2);

	const x = math.random(-halfSize.X, halfSize.X);
	const y = math.random(-halfSize.Y, halfSize.Y);
	const z = math.random(-halfSize.Z, halfSize.Z);

	return cf.Position.add(cf.RightVector.mul(x)).add(cf.UpVector.mul(y)).add(cf.LookVector.mul(z));
}

function raycastToGround(origin: Vector3): Vector3 | undefined {
	const rayDirection = new Vector3(0, -50, 0);
	const raycastParams = new RaycastParams();
	raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
	raycastParams.FilterDescendantsInstances = [];

	const result = Workspace.Raycast(origin, rayDirection, raycastParams);
	if (result) {
		return result.Position.add(new Vector3(0, 3, 0));
	}
	return undefined;
}

function teleportPlayer(player: Player) {
	const role = player.GetAttribute("role") as string | undefined;
	if (!role) return;

	const spawnAreas = Workspace.FindFirstChild("SpawnAreas") as Folder | undefined;
	if (!spawnAreas) {
		warn("[SpawnSystem] SpawnAreas folder not found");
		return;
	}

	const folderName = role === "Attacker" ? "Monster" : "Player";
	const folder = spawnAreas.FindFirstChild(folderName) as Folder | undefined;
	if (!folder) {
		warn(`[SpawnSystem] "${folderName}" folder not found`);
		return;
	}

	const position = getRandomSpawnPosition(folder);
	if (!position) {
		warn(`[SpawnSystem] no spawn parts in "${folderName}"`);
		return;
	}

	const groundPos = raycastToGround(position);
	const finalPos = groundPos ?? position.add(new Vector3(0, 3, 0));

	const character = player.Character;
	if (!character) return;

	const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (root) {
		root.CFrame = new CFrame(finalPos);
		print(`[SpawnSystem] ${player.Name} (${role}) teleported to spawn`);
	}
}

export function spawnAllPlayers() {
	for (const player of Players.GetPlayers()) {
		task.wait(0.01);
		teleportPlayer(player);
	}
	print("[SpawnSystem] all players spawned");
}
