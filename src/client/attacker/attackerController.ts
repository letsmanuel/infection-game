import { Players, RunService, UserInputService, Workspace, SoundService } from "@rbxts/services";

const WALK_SPEED = 16;
const SPRINT_SPEED = 26;
const CROUCH_SPEED = 6;
const JUMP_POWER = 50;
const MOUSE_SENSITIVITY = 0.4;
const MAX_PITCH = 80;

const IDLE_ANIM_ID = "rbxassetid://92701505225015";
const WALK_ANIM_ID = "rbxassetid://137302805971945";
const FOOTSTEP_SOUND_ID = "rbxassetid://121542193392069";

const BOB_WALK_SPEED = 10;
const BOB_WALK_AMOUNT = 0.2;
const BOB_IDLE_SPEED = 1.5;
const BOB_IDLE_AMOUNT = 0.05;
const SPRINT_BOB_MULTIPLIER = 2;
const BOB_LERP_SPEED = 8;

const WIND_MIN_ROTATION_SPEED = 300;
const WIND_MAX_ROTATION_SPEED = 400;
const WIND_VOLUME_LERP_SPEED = 10;

export class AttackerController {
	private player = Players.LocalPlayer;
	private camera = Workspace.CurrentCamera!;

	private rig?: Model;
	private rigHumanoid?: Humanoid;
	private rigRoot?: BasePart;
	private rigHead?: BasePart;

	private yaw = 0;
	private pitch = 0;
	private bobTime = 0;
	private currentBobOffset = new CFrame();
	private mouseLocked = true;

	private idleTrack?: AnimationTrack;
	private walkTrack?: AnimationTrack;

	private renderConn?: RBXScriptConnection;
	private inputBeganConn?: RBXScriptConnection;
	private inputEndedConn?: RBXScriptConnection;
	private roleConn?: RBXScriptConnection;

	private keysHeld = new Set<Enum.KeyCode>();
	private isMoving = false;
	private isSprinting = false;
	private isCrouching = false;

	private footstepSound?: Sound;
	private lastCameraCFrame?: CFrame;
	private currentWindVolume = 0;

	private active = false;

	start() {
		const tryActivate = () => {
			if (this.active) return;
			if (this.player.GetAttribute("gameStarted") === true
				&& this.player.GetAttribute("role") === "Attacker") {
				this.activate();
			}
		};

		this.player.GetAttributeChangedSignal("role").Connect(() => tryActivate());
		this.player.GetAttributeChangedSignal("gameStarted").Connect(() => tryActivate());

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
		if (!this.rig) {
			warn("AttackerController: could not find rig");
			this.player.SetAttribute("_rigCameraActive", false);
			return;
		}

		this.rigHumanoid = this.rig.FindFirstChildOfClass("Humanoid");
		this.rigRoot = this.rig.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		this.rigHead = this.rig.WaitForChild("Head") as BasePart | undefined;

		if (!this.rigHumanoid || !this.rigRoot || !this.rigHead) {
			warn("AttackerController: rig missing required parts (Humanoid, HumanoidRootPart, Head)");
			this.player.SetAttribute("_rigCameraActive", false);
			return;
		}

		this.rigHumanoid.WalkSpeed = 0;
		this.rigHumanoid.JumpPower = 0;
		this.rigHumanoid.AutoRotate = true;
		this.rigHumanoid.PlatformStand = true;

		this.setupAnimations();
		this.setupFootsteps();
		this.setupCamera();
		this.setupInput();

		this.player.SetAttribute("_rigCameraActive", true);
		this.active = true;
	}

	private findRig() {
		const expectedName = this.player.Name + "_Rig";
		const found = Workspace.FindFirstChild(expectedName);
		if (found && found.GetAttribute("controlledBy") === this.player.UserId) {
			this.rig = found as Model;
		}
	}

	private setupAnimations() {
		if (!this.rigHumanoid || !this.rig) return;

		const animator = this.rigHumanoid.FindFirstChildOfClass("Animator") ?? (() => {
			const a = new Instance("Animator");
			a.Parent = this.rigHumanoid;
			return a;
		})();

		const idleAnim = new Instance("Animation");
		idleAnim.AnimationId = IDLE_ANIM_ID;
		idleAnim.Parent = this.rig;

		const walkAnim = new Instance("Animation");
		walkAnim.AnimationId = WALK_ANIM_ID;
		walkAnim.Parent = this.rig;

		this.idleTrack = animator.LoadAnimation(idleAnim);
		this.walkTrack = animator.LoadAnimation(walkAnim);

		this.idleTrack.Looped = true;
		this.walkTrack.Looped = true;

		this.idleTrack.Play();
	}

	private setupFootsteps() {
		this.footstepSound = new Instance("Sound");
		this.footstepSound.SoundId = FOOTSTEP_SOUND_ID;
		this.footstepSound.Volume = 0.5;
		this.footstepSound.Parent = SoundService;
	}

	private setupCamera() {
		this.camera.CameraType = Enum.CameraType.Scriptable;

		UserInputService.InputChanged.Connect((input) => {
			if (this.player.GetAttribute("gameStarted") !== true) return;
			if (input.UserInputType === Enum.UserInputType.MouseMovement && this.mouseLocked) {
				this.yaw -= input.Delta.X * MOUSE_SENSITIVITY;
				this.pitch = math.clamp(
					this.pitch - input.Delta.Y * MOUSE_SENSITIVITY,
					-MAX_PITCH,
					MAX_PITCH,
				);
			}
		});

		if (this.player.GetAttribute("gameStarted") === true) {
			this.applyMouseLock();
		}

		this.player.GetAttributeChangedSignal("gameStarted").Connect(() => {
			this.applyMouseLock();
		});
	}

	private setupInput() {
		this.inputBeganConn = UserInputService.InputBegan.Connect((input, processed) => {
			if (processed) return;
			if (input.KeyCode === Enum.KeyCode.Tab) {
				this.toggleMouseLock();
				return;
			}
			this.keysHeld.add(input.KeyCode);
		});

		this.inputEndedConn = UserInputService.InputEnded.Connect((input) => {
			this.keysHeld.delete(input.KeyCode);
		});

		this.renderConn = RunService.RenderStepped.Connect((dt) => {
			this.updateMovement();
			this.updateCamera(dt);
			this.updateAnimation();
			this.updateFootsteps();
			this.updateWindSound(dt);
		});
	}

	private updateMovement() {
		if (!this.rigHumanoid || !this.rigRoot) return;

		let forward = 0;
		let strafe = 0;

		if (this.keysHeld.has(Enum.KeyCode.W)) forward += 1;
		if (this.keysHeld.has(Enum.KeyCode.S)) forward -= 1;
		if (this.keysHeld.has(Enum.KeyCode.A)) strafe -= 1;
		if (this.keysHeld.has(Enum.KeyCode.D)) strafe += 1;

		const sprintKey = this.keysHeld.has(Enum.KeyCode.LeftShift);
		const crouchKey = this.keysHeld.has(Enum.KeyCode.LeftControl);

		this.isSprinting = sprintKey && !crouchKey;
		this.isCrouching = crouchKey;

		const moveSpeed = crouchKey ? CROUCH_SPEED : (sprintKey ? SPRINT_SPEED : WALK_SPEED);

		const yawRad = math.rad(this.yaw);
		const forwardDir = new Vector3(-math.sin(yawRad), 0, -math.cos(yawRad));
		const rightDir = new Vector3(math.cos(yawRad), 0, -math.sin(yawRad));

		const moveDir = forwardDir.mul(forward).add(rightDir.mul(strafe));
		this.isMoving = moveDir.Magnitude > 0.01;

		const currentVel = this.rigRoot.AssemblyLinearVelocity;
		if (moveDir.Magnitude > 0.01) {
			const velocity = moveDir.Unit.mul(moveSpeed);
			this.rigRoot.AssemblyLinearVelocity = new Vector3(velocity.X, currentVel.Y, velocity.Z);
		} else {
			this.rigRoot.AssemblyLinearVelocity = new Vector3(0, currentVel.Y, 0);
		}

		if (this.keysHeld.has(Enum.KeyCode.Space) && this.isGrounded()) {
			this.rigRoot.AssemblyLinearVelocity = new Vector3(currentVel.X, JUMP_POWER, currentVel.Z);
		}
	}

	private isGrounded(): boolean {
		if (!this.rigRoot || !this.rig) return false;
		const rayOrigin = this.rigRoot.Position;
		const rayDirection = new Vector3(0, -3.5, 0);
		const raycastParams = new RaycastParams();
		raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
		raycastParams.FilterDescendantsInstances = [this.rig];
		const result = Workspace.Raycast(rayOrigin, rayDirection, raycastParams);
		return result !== undefined;
	}

	private updateCamera(dt: number) {
		if (!this.rigHead) return;

		const sprintMultiplier = this.isSprinting ? SPRINT_BOB_MULTIPLIER : 1;
		const speedFactor = (this.isMoving ? BOB_WALK_SPEED : BOB_IDLE_SPEED) * sprintMultiplier;
		const amount = (this.isMoving ? BOB_WALK_AMOUNT : BOB_IDLE_AMOUNT) * sprintMultiplier;

		this.bobTime += dt * speedFactor;

		const bobX = math.sin(this.bobTime) * amount;
		const bobY = math.abs(math.sin(this.bobTime * 2)) * amount;

		const targetBobOffset = new CFrame(new Vector3(bobX, bobY, 0));
		this.currentBobOffset = this.currentBobOffset.Lerp(targetBobOffset, math.clamp(dt * BOB_LERP_SPEED, 0, 1));

		const lookCFrame = new CFrame(this.rigHead.Position)
			.mul(CFrame.Angles(0, math.rad(this.yaw), 0))
			.mul(CFrame.Angles(math.rad(this.pitch), 0, 0));

		const camY = this.isCrouching ? -1.5 : 0;

		this.camera.CFrame = lookCFrame
			.mul(this.currentBobOffset)
			.mul(new CFrame(new Vector3(0, camY, 0)));
	}

	private updateAnimation() {
		if (!this.idleTrack || !this.walkTrack) return;

		if (this.isMoving) {
			if (!this.walkTrack.IsPlaying) {
				this.idleTrack.Stop();
				this.walkTrack.Play();
			}
			this.walkTrack.AdjustSpeed(this.isSprinting ? 1.5 : 1);
		} else {
			if (!this.idleTrack.IsPlaying) {
				this.walkTrack.Stop();
				this.idleTrack.Play();
			}
		}
	}

	private updateFootsteps() {
		if (!this.footstepSound) return;

		if (this.isMoving && !this.footstepSound.IsPlaying) {
			this.footstepSound.Playing = true;
			this.footstepSound.Looped = true;
		} else if (!this.isMoving && this.footstepSound.IsPlaying) {
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

	private applyMouseLock() {
		if (this.player.GetAttribute("gameStarted") === true && this.mouseLocked) {
			UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition;
			UserInputService.MouseIconEnabled = false;
		}
	}

	private toggleMouseLock() {
		this.mouseLocked = !this.mouseLocked;

		if (this.mouseLocked) {
			UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition;
			UserInputService.MouseIconEnabled = false;
		} else {
			UserInputService.MouseBehavior = Enum.MouseBehavior.Default;
			UserInputService.MouseIconEnabled = true;
		}
	}

	stop() {
		this.active = false;
		this.player.SetAttribute("_rigCameraActive", false);
		this.renderConn?.Disconnect();
		this.inputBeganConn?.Disconnect();
		this.inputEndedConn?.Disconnect();
		this.roleConn?.Disconnect();

		if (this.idleTrack) this.idleTrack.Stop();
		if (this.walkTrack) this.walkTrack.Stop();
		if (this.footstepSound) this.footstepSound.Stop();

		this.keysHeld.clear();

		UserInputService.MouseBehavior = Enum.MouseBehavior.Default;
		UserInputService.MouseIconEnabled = true;
	}
}
