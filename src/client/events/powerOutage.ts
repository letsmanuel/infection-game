import { Players, Workspace } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const FLICKER_COUNT = 6;
const FLICKER_INTERVAL = 0.18;

const ON_COLOR = new Color3(248 / 255, 217 / 255, 109 / 255);
const OFF_COLOR = new Color3(0, 0, 0);

function setBulbState(light: PointLight, on: boolean) {
	light.Enabled = on;

	const mesh = light.Parent?.Parent?.Parent?.FindFirstChild("Light") as MeshPart | undefined;
	if (mesh) {
		mesh.Color = on ? ON_COLOR : OFF_COLOR;
		mesh.Material = on ? Enum.Material.Neon : Enum.Material.Grass;
	}
}

function getBulbLights(): PointLight[] {
	const lights: PointLight[] = [];
	const seen = new Set<PointLight>();

	for (const descendant of Workspace.GetDescendants()) {
		if (descendant.IsA("PointLight") && descendant.Name === "inHouseLight") {
			seen.add(descendant);
			lights.push(descendant);
			continue;
		}

		if (descendant.Name === "inHouseLight") {
			for (const child of descendant.GetDescendants()) {
				if (child.IsA("PointLight") && !seen.has(child)) {
					seen.add(child);
					lights.push(child);
				}
			}
			continue;
		}

		if (descendant.Name === "Bulb" && descendant.IsA("Model")) {
			for (const child of descendant.GetChildren()) {
				if (child.IsA("Attachment")) {
					const pointLight = child.FindFirstChildOfClass("PointLight");
					if (pointLight && !seen.has(pointLight)) {
						seen.add(pointLight);
						lights.push(pointLight);
					}
				}
			}
		}
	}

	return lights;
}

task.spawn(() => {
	task.wait(3);
	const initialBulbLights = getBulbLights();
	print(`[PowerOutage] On launch — found ${initialBulbLights.size()} lights:`);
	for (const light of initialBulbLights) {
		print(`  - ${light.GetFullName()}`);
	}
});

const electricalBox = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("electricalBox") as Model;
const outageFolder = electricalBox.WaitForChild("powerOutageEvent") as Folder;

const promptOpen = outageFolder.WaitForChild("Open").WaitForChild("ProximityPrompt") as ProximityPrompt;
const promptStep1 = outageFolder.WaitForChild("1").WaitForChild("ProximityPrompt") as ProximityPrompt;
const promptStep2 = outageFolder.WaitForChild("2").WaitForChild("ProximityPrompt") as ProximityPrompt;

promptOpen.Enabled = false;
promptStep1.Enabled = false;
promptStep2.Enabled = false;

export class PowerOutageClient {
	private active = false;
	private bulbLights: PointLight[] = [];
	private flickerThread?: thread;

	start() {
		Remotes.Client.Get(RemoteId.powerOutageState).Connect((active) => {
			if (active) {
				this.onWarning();
			} else {
				this.onEnd();
			}
		});

		Remotes.Client.Get(RemoteId.powerOutageMainStart).Connect(() => {
			this.onMainStart();
		});

		this.setupPromptHandlers();
	}

	private onWarning() {
		this.bulbLights = getBulbLights();
		print(`[PowerOutage] Flickering ${this.bulbLights.size()} lights`);

		this.flickerThread = task.spawn(() => {
			for (let i = 0; i < FLICKER_COUNT; i++) {
				const on = i % 2 === 0;
				for (const light of this.bulbLights) {
					setBulbState(light, on);
				}
				task.wait(FLICKER_INTERVAL);
			}
			for (const light of this.bulbLights) {
				setBulbState(light, true);
			}
			print("[PowerOutage] Warning flicker complete, lights remain on");
		});
	}

	private onMainStart() {
		if (this.active) return;
		this.active = true;

		for (const light of this.bulbLights) {
			setBulbState(light, false);
		}
		print("[PowerOutage] Lights cut");

		promptOpen.Enabled = true;
	}

	private onEnd() {
		if (!this.active) return;
		this.active = false;

		for (const light of this.bulbLights) {
			setBulbState(light, true);
		}
		print("[PowerOutage] Lights restored");

		promptOpen.Enabled = false;
		promptStep1.Enabled = false;
		promptStep2.Enabled = false;

		if (this.flickerThread) {
			task.cancel(this.flickerThread);
			this.flickerThread = undefined;
		}
	}

	private setupPromptHandlers() {
		promptOpen.Triggered.Connect(() => {
			if (!this.active) return;
			promptOpen.Enabled = false;
			Remotes.Client.Get(RemoteId.electricalBoxStep).SendToServer("open");

			task.wait(0.6);
			promptStep1.Enabled = true;
		});

		promptStep1.Triggered.Connect(() => {
			if (!this.active) return;
			promptStep1.Enabled = false;
			Remotes.Client.Get(RemoteId.electricalBoxStep).SendToServer("step1");
			promptStep2.Enabled = true;
		});

		promptStep2.Triggered.Connect(() => {
			if (!this.active) return;
			promptStep2.Enabled = false;
			Remotes.Client.Get(RemoteId.electricalBoxStep).SendToServer("step2");
		});
	}
}
