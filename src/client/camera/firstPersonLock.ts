import { Workspace, Players, RunService, UserInputService, SoundService } from "@rbxts/services";

const BOB_WALK_SPEED = 10;
const BOB_WALK_AMOUNT = 0.2;
const BOB_IDLE_SPEED = 1.5;
const BOB_IDLE_AMOUNT = 0.05;
const WALK_SWAY_AMOUNT = 0.005;
const LERP_SPEED = 8;

const SPRINT_BOB_MULTIPLIER = 2;

const MOUSE_SWAY_POS_AMOUNT = 10;
const MOUSE_SWAY_TILT_AMOUNT = 25;
const MOUSE_SWAY_LERP_SPEED = 6;
const MOUSE_SWAY_RETURN_SPEED = 4;
const MAX_MOUSE_SWAY_OFFSET = 0.25;

const WIND_MIN_ROTATION_SPEED = 300;
const WIND_MAX_ROTATION_SPEED = 400;
const WIND_VOLUME_LERP_SPEED = 10;

const MENU_BOB_SPEED = 1;
const MENU_BOB_AMOUNT = 0.15;

const MOUSE_SENSITIVITY = 0.4;
const MAX_PITCH = 80;

export class FirstPersonLock {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;
    private bobTime = 0;
    private currentBobOffset = new CFrame();

    private swayOffset = Vector2.zero;
    private currentSwayCFrame = new CFrame();

    private connection?: RBXScriptConnection;
    private inputConnection?: RBXScriptConnection;
    private attributeChangedConn?: RBXScriptConnection;
    private shopAttrConn?: RBXScriptConnection;

    private mouseLocked = true;

    private lastCameraCFrame?: CFrame;
    private currentWindVolume = 0;

    private menuBobTime = 0;

    private yaw = 0;
    private pitch = 0;

    private currentCharacter?: Model;

    start() {
        this.camera.CameraType = Enum.CameraType.Scriptable;

        const character = this.player.Character ?? this.player.CharacterAdded.Wait()[0];
        this.currentCharacter = character;
        const humanoid = character.WaitForChild("Humanoid") as Humanoid;
        humanoid.CameraOffset = new Vector3(0, 0, 0);

        const head = character.WaitForChild("Head") as BasePart;
        this.yaw = math.deg(math.atan2(-head.CFrame.LookVector.X, -head.CFrame.LookVector.Z));
        this.pitch = 0;

        this.player.CharacterAdded.Connect((char) => {
            this.currentCharacter = char;
            const hum = char.WaitForChild("Humanoid") as Humanoid;
            hum.CameraOffset = new Vector3(0, 0, 0);

            const newHead = char.WaitForChild("Head") as BasePart;
            this.yaw = math.deg(math.atan2(-newHead.CFrame.LookVector.X, -newHead.CFrame.LookVector.Z));
            this.pitch = 0;
        });

        this.inputConnection = UserInputService.InputChanged.Connect((input) => {
            if (input.UserInputType === Enum.UserInputType.MouseMovement) {
                const gameStarted = this.player.GetAttribute("gameStarted") === true;
                const inShop = this.player.GetAttribute("_shopOpen") === true;

                if (gameStarted && this.mouseLocked && !inShop) {
                    this.yaw -= input.Delta.X * MOUSE_SENSITIVITY;
                    this.pitch = math.clamp(
                        this.pitch - input.Delta.Y * MOUSE_SENSITIVITY,
                        -MAX_PITCH,
                        MAX_PITCH,
                    );
                }

                this.swayOffset = new Vector2(
                    math.clamp(
                        this.swayOffset.X - input.Delta.X * 0.01,
                        -MAX_MOUSE_SWAY_OFFSET * 100,
                        MAX_MOUSE_SWAY_OFFSET * 100,
                    ),
                    math.clamp(
                        this.swayOffset.Y - input.Delta.Y * 0.01,
                        -MAX_MOUSE_SWAY_OFFSET * 100,
                        MAX_MOUSE_SWAY_OFFSET * 100,
                    ),
                );
            } else if (input.UserInputType === Enum.UserInputType.Touch) {
                const gameStarted = this.player.GetAttribute("gameStarted") === true;
                const inShop = this.player.GetAttribute("_shopOpen") === true;

                if (gameStarted && this.mouseLocked && !inShop) {
                    this.yaw -= input.Delta.X * MOUSE_SENSITIVITY;
                    this.pitch = math.clamp(
                        this.pitch - input.Delta.Y * MOUSE_SENSITIVITY,
                        -MAX_PITCH,
                        MAX_PITCH,
                    );
                }
            }
        });

        this.connection = RunService.RenderStepped.Connect((dt) => {
            this.update(dt);
        });

        UserInputService.WindowFocusReleased.Connect(() => {
            if (this.player.GetAttribute("gameStarted") === true) {
                UserInputService.MouseIconEnabled = false;
            }
        });

        UserInputService.InputBegan.Connect((input, gameProcessed) => {
            if (gameProcessed) return;
            if (input.KeyCode === Enum.KeyCode.Tab) {
                const inShop = this.player.GetAttribute("_shopOpen") === true;
                if (this.player.GetAttribute("gameStarted") === true && !inShop) {
                    this.toggleMouseLock();
                }
            }
        });

        this.applyMouseStateForCurrentMode();

        this.attributeChangedConn = this.player.GetAttributeChangedSignal("gameStarted").Connect(() => {
            this.applyMouseStateForCurrentMode();
        });
        this.shopAttrConn = this.player.GetAttributeChangedSignal("_shopOpen").Connect(() => {
            this.applyMouseStateForCurrentMode();
        });
    }

    private applyMouseStateForCurrentMode() {
        const gameStarted = this.player.GetAttribute("gameStarted") === true;
        const inShop = this.player.GetAttribute("_shopOpen") === true;

        if (gameStarted && !inShop) {
            if (this.mouseLocked) {
                UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition;
                UserInputService.MouseIconEnabled = false;
            }
        } else {
            UserInputService.MouseBehavior = Enum.MouseBehavior.Default;
            UserInputService.MouseIconEnabled = true;
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

    private updateWindSound(dt: number) {
        const parentFolder = SoundService.FindFirstChild("master") as SoundGroup;
        if (!parentFolder){
            warn("Sound aint here btw");
            return
        }
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

    private updateMenuCamera(dt: number) {
        const menuCamPart = Workspace.FindFirstChild("MenuCam") as BasePart | undefined;
        if (!menuCamPart) return;

        this.menuBobTime += dt * MENU_BOB_SPEED;

        const bobX = math.sin(this.menuBobTime) * MENU_BOB_AMOUNT;
        const bobY = math.abs(math.sin(this.menuBobTime * 2)) * MENU_BOB_AMOUNT;

        const bobOffset = new CFrame(new Vector3(bobX, bobY, 0));
        this.camera.CFrame = menuCamPart.CFrame.mul(bobOffset);
    }

    private update(dt: number) {
        const gameStarted = this.player.GetAttribute("gameStarted") === true;
        const inShop = this.player.GetAttribute("_shopOpen") === true;

        if (!gameStarted) {
            this.updateMenuCamera(dt);
            return;
        }

        if (inShop) return;

        const character = this.currentCharacter;
        if (!character) return;

        const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
        if (!humanoid) return;

        const head = character.FindFirstChild("Head") as BasePart | undefined;
        if (!head) return;

        if (this.mouseLocked) {
            UserInputService.MouseIconEnabled = false;
            if (UserInputService.MouseBehavior !== Enum.MouseBehavior.LockCurrentPosition) {
                UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition;
            }
        }

        const isSprinting = this.player.GetAttribute("_sprinting") === true;
        const sprintMultiplier = isSprinting ? SPRINT_BOB_MULTIPLIER : 1;

        const moveVector = humanoid.MoveDirection;
        const isMoving = moveVector.Magnitude > 0.05;
        const speedFactor = (isMoving ? BOB_WALK_SPEED : BOB_IDLE_SPEED) * sprintMultiplier;
        const amount = (isMoving ? BOB_WALK_AMOUNT : BOB_IDLE_AMOUNT) * sprintMultiplier;

        this.bobTime += dt * speedFactor;

        const bobX = math.sin(this.bobTime) * amount;
        const bobY = math.abs(math.sin(this.bobTime * 2)) * amount;

        const walkSway = isMoving
            ? math.sin(this.bobTime * 0.5) * WALK_SWAY_AMOUNT * sprintMultiplier
            : 0;

        const targetBobOffset = new CFrame(new Vector3(bobX, bobY, 0)).mul(
            CFrame.Angles(0, 0, math.rad(walkSway)),
        );

        this.currentBobOffset = this.currentBobOffset.Lerp(
            targetBobOffset,
            math.clamp(dt * LERP_SPEED, 0, 1),
        );

        this.swayOffset = this.swayOffset.Lerp(
            Vector2.zero,
            math.clamp(dt * MOUSE_SWAY_RETURN_SPEED, 0, 1),
        );

        const normX = math.clamp(this.swayOffset.X / 100, -1, 1);
        const normY = math.clamp(this.swayOffset.Y / 100, -1, 1);

        const swayPosOffset = new Vector3(
            normX * MOUSE_SWAY_POS_AMOUNT,
            -normY * MOUSE_SWAY_POS_AMOUNT * 0.5,
            0,
        );
        const swayTiltDeg = -normX * MOUSE_SWAY_TILT_AMOUNT;
        const swayPitchDeg = normY * MOUSE_SWAY_TILT_AMOUNT * 0.4;

        const targetSwayCFrame = new CFrame(swayPosOffset).mul(
            CFrame.Angles(math.rad(swayPitchDeg), 0, math.rad(swayTiltDeg)),
        );

        this.currentSwayCFrame = this.currentSwayCFrame.Lerp(
            targetSwayCFrame,
            math.clamp(dt * MOUSE_SWAY_LERP_SPEED, 0, 1),
        );

        const cameraYOffset = this.player.GetAttribute("_cameraYOffset") as number | undefined;
        const headPos = head.Position.add(new Vector3(0, cameraYOffset ?? 0, 0));

        const lookCFrame = new CFrame(headPos).mul(
            CFrame.Angles(0, math.rad(this.yaw), 0),
        ).mul(
            CFrame.Angles(math.rad(this.pitch), 0, 0),
        );

        this.camera.CFrame = lookCFrame
            .mul(this.currentBobOffset)
            .mul(this.currentSwayCFrame);

        this.updateWindSound(dt);
    }

    stop() {
        this.connection?.Disconnect();
        this.inputConnection?.Disconnect();
        this.attributeChangedConn?.Disconnect();
        this.shopAttrConn?.Disconnect();
        UserInputService.MouseIconEnabled = true;
        UserInputService.MouseBehavior = Enum.MouseBehavior.Default;
    }
}