import { Players, Workspace, RunService, TweenService, SoundService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";
import { getGameState, setPowerOutageActive } from "server/gameState";
import { GameState } from "shared/configs/gameState";

const MIN_INTERVAL = 5 * 60;
const MAX_INTERVAL = 10 * 60;
const INITIAL_DELAY = 3 * 60;

const DOOR_OPEN_ANGLE = -118;
const DOOR_DURATION = 0.6;

function getOrCreateDoorCFrameValue(doorModel: Model): CFrameValue {
	const existing = doorModel.FindFirstChild("_doorCFrameValue") as CFrameValue | undefined;
	if (existing) return existing;
	const cf = new Instance("CFrameValue");
	cf.Name = "_doorCFrameValue";
	cf.Parent = doorModel;
	return cf;
}

function tweenDoor(doorModel: Model, targetCFrame: CFrame, callback?: () => void) {
	const primaryPart = doorModel.PrimaryPart ?? doorModel.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
	if (!primaryPart) return;

	doorModel.PrimaryPart = primaryPart;

	const cfValue = getOrCreateDoorCFrameValue(doorModel);
	cfValue.Value = primaryPart.CFrame;

	const changedConn = cfValue.Changed.Connect(() => {
		doorModel.SetPrimaryPartCFrame(cfValue.Value);
	});

	const tweenInfo = new TweenInfo(DOOR_DURATION, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);
	const tween = TweenService.Create(cfValue, tweenInfo, { Value: targetCFrame });

	tween.Completed.Connect(() => {
		changedConn.Disconnect();
		if (callback) callback();
	});

	tween.Play();
}

const electricalBox = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("electricalBox") as Model;
const outageFolder = electricalBox.WaitForChild("powerOutageEvent") as Folder;
const particleEnergy = outageFolder.WaitForChild("energy") as ParticleEmitter;
const doorModel = electricalBox.WaitForChild("Electrical box").WaitForChild("Door") as Model;

const preOutageSound = SoundService.WaitForChild("preOutage") as Sound;
const powerOutageGroup = SoundService.WaitForChild("master").WaitForChild("PowerOutage") as SoundGroup;
const backSound = powerOutageGroup.WaitForChild("back") as Sound;
const restoredGroup = SoundService.WaitForChild("master").WaitForChild("PowerRestored") as SoundGroup;
const restoredSfx = restoredGroup.WaitForChild("sfx") as Sound;

const bgNoise = outageFolder.WaitForChild("bgNoise") as Sound;
const circuitSound = outageFolder.WaitForChild("circuit") as Sound;

let instance: PowerOutageController;

export function getPowerOutageController(): PowerOutageController {
	return instance;
}

export class PowerOutageController {
	private running = false;
	private eventActive = false;
	private closedDoorCFrame?: CFrame;
	private soundThread?: thread;
	private circuitRunning = false;

	start() {
		if (this.running) return;
		this.running = true;
		instance = this;

		particleEnergy.Enabled = false;

		Remotes.Server.Get(RemoteId.electricalBoxStep).Connect((player, step) => {
			if (!this.eventActive) return;
			this.handleStep(step);
		});

		task.spawn(() => {
			while (this.running && getGameState() !== GameState.Villa) {
				task.wait(1);
			}
			if (!this.running) return;

			print(`[PowerOutage] Villa state detected. Waiting ${INITIAL_DELAY}s initial delay before first event...`);
			task.wait(INITIAL_DELAY);
			if (!this.running) return;

			while (this.running) {
				const waitTime = MIN_INTERVAL + math.random() * (MAX_INTERVAL - MIN_INTERVAL);
				print(`[PowerOutage] Next power outage in ${"%.1f".format(waitTime)}s (${"%.1f".format(waitTime / 60)}m)`);

				const waitStart = os.clock();
				while (this.running && (os.clock() - waitStart) < waitTime) {
					if (getGameState() !== GameState.Villa) break;
					task.wait(0.5);
				}

				if (!this.running) return;
				if (getGameState() !== GameState.Villa) continue;

				print("[PowerOutage] POWER OUTAGE EVENT STARTING!");
				this.startEvent();
			}
		});
	}

	public startEvent() {
		if (this.eventActive) return;
		this.eventActive = true;

		setPowerOutageActive(true);
		Remotes.Server.Get(RemoteId.powerOutageState).SendToAllPlayers(true);
		task.spawn(() => {
			task.wait(3)
			for (const player of Players.GetPlayers()) {
				if (player.GetAttribute("role") !== "Attacker") {
					Remotes.Server.Get(RemoteId.giveClientHint).SendToPlayer(player, "What was that? Weird...");
				}
			}
		});

		preOutageSound.Play();
		print("[PowerOutage] Playing preOutage, starting warning flicker");

		this.soundThread = task.spawn(() => {
			task.wait(6);
			if (!this.eventActive) return;

			for (const child of powerOutageGroup.GetChildren()) {
				if (child.IsA("Sound") && child !== backSound) {
					child.Play();
				}
			}
			print("[PowerOutage] PowerOutage sounds played");

			this.startCircuitLoop();
			bgNoise.Looped = true;
			bgNoise.Play();
			print("[PowerOutage] bgNoise + circuit started");

			particleEnergy.Enabled = true;
			print("[PowerOutage] Particle emitter enabled");
			
			task.spawn(() => {
				task.wait(1.5)
				for (const player of Players.GetPlayers()) {
					if (player.GetAttribute("role") !== "Attacker") {
						Remotes.Server.Get(RemoteId.giveClientHint).SendToPlayer(player, "I should check the breaker box in the basement...");
					}
				}
			})

			Remotes.Server.Get(RemoteId.powerOutageMainStart).SendToAllPlayers();
			print("[PowerOutage] Main phase broadcast sent to clients");
		});
	}

	private startCircuitLoop() {
		this.circuitRunning = true;
		task.spawn(() => {
			while (this.circuitRunning) {
				const delay = 2 + math.random() * 4;
				task.wait(delay);
				if (!this.circuitRunning) break;
				//circuitSound.Play(); 
				// dead code for now, is kinda distracing tbh
			}
		});
	}

	public endEvent() {
		if (!this.eventActive) return;
		this.eventActive = false;

		setPowerOutageActive(false);
		Remotes.Server.Get(RemoteId.powerOutageState).SendToAllPlayers(false);

		particleEnergy.Enabled = false;

		if (this.closedDoorCFrame) {
			tweenDoor(doorModel, this.closedDoorCFrame);
		}

		this.stopCircuitAndBgNoise();

		backSound.Play();
		print("[PowerOutage] Playing back sound");

		task.spawn(() => {
			restoredSfx.Looped = true;
			restoredSfx.Volume = 1;
			restoredSfx.Play();

			const fadeDuration = 10;
			const steps = 20;
			const stepTime = fadeDuration / steps;

			for (let i = 1; i <= steps; i++) {
				restoredSfx.Volume = 1 - (i / steps);
				task.wait(stepTime);
			}

			restoredSfx.Stop();
			restoredSfx.Volume = 0;
			print("[PowerOutage] Restored sfx faded out");
		});

		this.closedDoorCFrame = undefined;
	}

	private stopCircuitAndBgNoise() {
		this.circuitRunning = false;
		if (bgNoise.IsPlaying) bgNoise.Stop();
		if (circuitSound.IsPlaying) circuitSound.Stop();
	}

	private handleStep(step: string) {
		print(`[PowerOutage] Step received: ${step}`);

		if (step === "open") {
			const primaryPart = doorModel.PrimaryPart ?? doorModel.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
			if (primaryPart) {
				this.closedDoorCFrame = primaryPart.CFrame;
				const openCFrame = primaryPart.CFrame.mul(CFrame.Angles(0, math.rad(DOOR_OPEN_ANGLE), 0));
				tweenDoor(doorModel, openCFrame);
			}
		} else if (step === "step2") {
			this.endEvent();
		}
	}
}
