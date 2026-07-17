import { Players, RunService, UserInputService, Workspace, SoundService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const AnimStateRemote = Remotes.Client.Get(RemoteId.attackerAnimState);

const FOOTSTEP_SOUND_ID = "rbxassetid://121542193392069";

const WIND_MIN_ROTATION_SPEED = 300;
const WIND_MAX_ROTATION_SPEED = 400;
const WIND_VOLUME_LERP_SPEED = 10;

export class AttackerController {
	private player = Players.LocalPlayer;
	private camera = Workspace.CurrentCamera!;

	private rig?: Model;
	private charHumanoid?: Humanoid;

	private renderConn?: RBXScriptConnection;
	private hideLoopRunning = false;

	private isMoving = false;
	private isSprinting = false;
	private isCrouching = false;

	private footstepSound?: Sound;
	private lastCameraCFrame?: CFrame;
	private currentWindVolume = 0;

	private active = false;
	private sentMoving = false;

	start() {
		print("[Attacker] start() called, role:", this.player.GetAttribute("role"), "gameStarted:", this.player.GetAttribute("gameStarted"));

		const tryActivate = () => {
			const role = this.player.GetAttribute("role");
			const gs = this.player.GetAttribute("gameStarted");
			if (this.active) return;
			if (gs === true && role === "Attacker") {
				this.activate();
			}
		};

		this.player.GetAttributeChangedSignal("role").Connect(() => {
			tryActivate();
		});
		this.player.GetAttributeChangedSignal("gameStarted").Connect(() => {
			tryActivate();
		});

		const setupConn = this.player.CharacterAdded.Connect(() => tryActivate());
		task.delay(5, () => {
			setupConn.Disconnect();
		});

		tryActivate();
	}

	private activate() {
		if (this.active) return;

		this.findRig();
		if (!this.rig) {
			let checks = 0;
			while (checks < 20 && !this.rig) {
				task.wait(0.25);
				this.findRig();
				checks++;
			}
		}
		if (!this.rig) return;

		this.hideLoopRunning = true;
		this.keepRigHidden();

		const char = this.player.Character;
		if (char) {
			this.charHumanoid = char.FindFirstChildOfClass("Humanoid");
		}

		this.setupFootsteps();
		this.setupInput();

		task.wait(0.5);
		this.computeCameraOffset();

		this.active = true;
	}

	private keepRigHidden() {
		const hide = () => {
			if (!this.rig) return;
			for (const child of this.rig.GetDescendants()) {
				if (child.IsA("BasePart")) {
					child.Transparency = 1;
				}
			}
		};

		hide();

		const hideConn = RunService.Heartbeat.Connect(() => {
			if (!this.hideLoopRunning) {
				hideConn.Disconnect();
				return;
			}
			hide();
		});

		if (this.rig) {
			this.rig.DescendantAdded.Connect((child) => {
				if (child.IsA("BasePart")) {
					child.Transparency = 1;
				}
			});
		}
	}

	private computeCameraOffset() {
		const char = this.player.Character;
		if (!char || !this.rig) return;

		const charRoot = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		const rigRoot = this.rig.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		const charHead = char.FindFirstChild("Head") as BasePart | undefined;
		const rigHead = this.rig.FindFirstChild("Head", true) as BasePart | undefined;

		if (!charRoot || !rigRoot || !charHead || !rigHead) return;

		const charHeadHeight = charHead.Position.Y - charRoot.Position.Y;
		const rigHeadHeight = rigHead.Position.Y - rigRoot.Position.Y;
		const offset = rigHeadHeight - charHeadHeight;

		if (math.abs(offset) > 0.1) {
			this.player.SetAttribute("_cameraYOffset", offset);
		}
	}

	private findRig() {
		const expectedName = this.player.Name + "_Rig";
		for (const child of Workspace.GetChildren()) {
			if (child.Name === expectedName && child.GetAttribute("controlledBy") === this.player.UserId) {
				this.rig = child as Model;
				return;
			}
		}
	}

	private setupFootsteps() {
		this.footstepSound = new Instance("Sound");
		this.footstepSound.SoundId = FOOTSTEP_SOUND_ID;
		this.footstepSound.Volume = 1;
		this.footstepSound.Parent = SoundService;
	}

	private setupInput() {
		UserInputService.InputBegan.Connect((input, processed) => {
			if (processed) return;
			if (input.KeyCode === Enum.KeyCode.LeftControl) {
				this.isCrouching = true;
			}
		});

		UserInputService.InputEnded.Connect((input) => {
			if (input.KeyCode === Enum.KeyCode.LeftControl) {
				this.isCrouching = false;
			}
		});

		this.renderConn = RunService.RenderStepped.Connect((dt) => {
			this.updateState();
			this.updateFootsteps();
			this.updateWindSound(dt);
		});
	}

    private updateState() {
        const isDead = this.player.GetAttribute("_dead") === true;
        const charHum = this.charHumanoid;
        const moving = !isDead && charHum && charHum.Parent
            ? charHum.MoveDirection.Magnitude > 0.1
            : false;
        const sprinting = !isDead && this.player.GetAttribute("_sprinting") === true;

        if (moving !== this.isMoving || sprinting !== this.isSprinting || this.isCrouching !== this.wasCrouching) {
            this.isMoving = moving;
            this.isSprinting = sprinting;
            this.wasCrouching = this.isCrouching;
            AnimStateRemote.SendToServer(moving, sprinting, this.isCrouching);
        }
    }
	private wasCrouching = false;

    private updateFootsteps() {
        if (!this.footstepSound) return;

        const isDead = this.player.GetAttribute("_dead") === true;
        const moving = !isDead && this.charHumanoid && this.charHumanoid.Parent
            ? this.charHumanoid.MoveDirection.Magnitude > 0.1
            : false;

        if (moving && !this.footstepSound.IsPlaying) {
            this.footstepSound.Playing = true;
            this.footstepSound.Looped = true;
        } else if (!moving && this.footstepSound.IsPlaying) {
            this.footstepSound.Stop();
        }
    }

	private updateWindSound(dt: number) {
		const parentFolder = SoundService.FindFirstChild("master") as SoundGroup | undefined;
		if (!parentFolder) return;
		const windSound = parentFolder.FindFirstChild("HeadMove")?.FindFirstChild("wind") as Sound | undefined;
		if (!windSound) return;

		const currentCameraCFrame = this.camera.CFrame;
		let rotationSpeedDegPerSec = 0;

		if (this.lastCameraCFrame !== undefined && dt > 0) {
			const lastLook = this.lastCameraCFrame.LookVector;
			const currentLook = currentCameraCFrame.LookVector;
			const dot = math.clamp(lastLook.Dot(currentLook), -1, 1);
			const angleRad = math.acos(dot);
			const angleDeg = math.deg(angleRad);
			rotationSpeedDegPerSec = angleDeg / dt;
		}

		this.lastCameraCFrame = currentCameraCFrame;

		const targetVolume = math.clamp(
			(rotationSpeedDegPerSec - WIND_MIN_ROTATION_SPEED)
				/ (WIND_MAX_ROTATION_SPEED - WIND_MIN_ROTATION_SPEED),
			0,
			0.2,
		);

		this.currentWindVolume = this.currentWindVolume
			+ (targetVolume - this.currentWindVolume) * math.clamp(dt * WIND_VOLUME_LERP_SPEED, 0, 1);

		windSound.Volume = this.currentWindVolume;

		if (this.currentWindVolume > 0.01) {
			if (!windSound.IsPlaying) windSound.Play();
		} else {
			if (windSound.IsPlaying) windSound.Stop();
		}
	}

	stop() {
		this.active = false;
		this.hideLoopRunning = false;
		this.player.SetAttribute("_cameraYOffset", undefined);
		this.renderConn?.Disconnect();

		if (this.footstepSound) this.footstepSound.Stop();
	}
}
