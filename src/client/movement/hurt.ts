// FallDamageModule.ts
import { Players, RunService, Workspace, SoundService } from "@rbxts/services";
import { CrouchModule } from "./crouching";

const FALL_DAMAGE_THRESHOLD = 15; // studs
const LAND_SOUND_THRESHOLD = 5; // studs, minimum fall to play any landing sound
const FALL_DAMAGE_AMOUNT = 30;
const WATER_FALL_DAMAGE_MULTIPLIER = 0.5; // 50% less damage landing in water

const SLOWED_WALK_SPEED = 4;
const SLOWED_DURATION = 0.5; // seconds before recovering
const RECOVER_LERP_SPEED = 4;

const CAM_DOWN_ANGLE = 40; // degrees to pitch camera down
const CAM_TILT_LERP_SPEED = 10;
const CAM_RECOVER_LERP_SPEED = 5;

const LAND_PITCH_MIN = 0.85;
const LAND_PITCH_MAX = 1.15;

export class FallDamageModule {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;
    private humanoid?: Humanoid;
    private rootPart?: BasePart;

    private crouchModule?: CrouchModule;

    private preStandWalkSpeed = 16;

    private falling = false;
    private fallStartY = 0;

    private inRecoveryState = false;
    private recoveryTimer = 0;

    private currentCamTiltOffset = 0;
    private targetCamTiltOffset = 0;

    private charAddedConn?: RBXScriptConnection;
    private renderConn?: RBXScriptConnection;
    private stateChangedConn?: RBXScriptConnection;

    constructor(crouchModule?: CrouchModule) {
        this.crouchModule = crouchModule;
    }

    start() {
        const setup = (char: Model) => {
            this.humanoid = char.WaitForChild("Humanoid") as Humanoid;
            this.rootPart = char.WaitForChild("HumanoidRootPart") as BasePart;
            this.preStandWalkSpeed = this.humanoid.WalkSpeed;

            this.stateChangedConn?.Disconnect();
            this.stateChangedConn = this.humanoid.StateChanged.Connect((_, newState) => {
                if (!this.humanoid || !this.rootPart) return;

                if (newState === Enum.HumanoidStateType.Freefall) {
                    this.falling = true;
                    this.fallStartY = this.rootPart.Position.Y;
                } else if (
                    this.falling
                    && (newState === Enum.HumanoidStateType.Landed
                        || newState === Enum.HumanoidStateType.Running
                        || newState === Enum.HumanoidStateType.Jumping)
                ) {
                    this.falling = false;
                    const fallDistance = this.fallStartY - this.rootPart.Position.Y;

                    this.onLand(fallDistance);
                }
            });
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        this.renderConn = RunService.RenderStepped.Connect((dt) => {
            this.update(dt);
        });
    }

    private isLandingInWater(): boolean {
        if (!this.humanoid) return false;
        return this.humanoid.FloorMaterial === Enum.Material.Water;
    }

    private playSpecificSound(folderName: string, soundName: string) {
        const folder = SoundService.FindFirstChild(folderName);
        if (!folder) return;

        const sound = folder.FindFirstChild(soundName) as Sound | undefined;
        if (!sound) return;

        sound.PlaybackSpeed = LAND_PITCH_MIN + math.random() * (LAND_PITCH_MAX - LAND_PITCH_MIN);
        sound.Play();
    }

    private playRandomSoundFromFolder(folderName: string) {
        const folder = SoundService.FindFirstChild(folderName);
        if (!folder) return;

        const sounds = folder.GetChildren().filter((c) => c.IsA("Sound")) as Sound[];
        if (sounds.size() === 0) return;

        const chosen = sounds[math.random(0, sounds.size() - 1)];
        chosen.PlaybackSpeed = LAND_PITCH_MIN + math.random() * (LAND_PITCH_MAX - LAND_PITCH_MIN);
        chosen.Play();
    }

    private onLand(fallDistance: number) {
        if (!this.humanoid) return;

        const landedInWater = this.isLandingInWater();

        if (fallDistance >= LAND_SOUND_THRESHOLD) {
            this.playSpecificSound("LandEffect", landedInWater ? "water" : "everything");
        }

        if (fallDistance < FALL_DAMAGE_THRESHOLD) {
            return;
        }

        const damage = landedInWater ? FALL_DAMAGE_AMOUNT * WATER_FALL_DAMAGE_MULTIPLIER : FALL_DAMAGE_AMOUNT;
        this.humanoid.TakeDamage(damage);

        this.playRandomSoundFromFolder("HurtEffect");

        this.crouchModule?.setCrouching(true);

        this.preStandWalkSpeed = this.humanoid.WalkSpeed > SLOWED_WALK_SPEED
            ? this.humanoid.WalkSpeed
            : this.preStandWalkSpeed;
        this.humanoid.WalkSpeed = SLOWED_WALK_SPEED;

        this.targetCamTiltOffset = CAM_DOWN_ANGLE;

        this.inRecoveryState = true;
        this.recoveryTimer = 0;
    }

    private update(dt: number) {
        if (this.inRecoveryState) {
            this.recoveryTimer += dt;

            if (this.recoveryTimer >= SLOWED_DURATION) {
                this.targetCamTiltOffset = 0;

                if (this.crouchModule?.isCrouching()) {
                    this.crouchModule.setCrouching(false);
                }

                if (this.humanoid) {
                    this.humanoid.WalkSpeed = this.humanoid.WalkSpeed
                        + (this.preStandWalkSpeed - this.humanoid.WalkSpeed)
                            * math.clamp(dt * RECOVER_LERP_SPEED, 0, 1);
                }

                if (math.abs(this.currentCamTiltOffset - this.targetCamTiltOffset) < 0.1) {
                    this.inRecoveryState = false;
                }
            }
        }

        const lerpSpeed = this.targetCamTiltOffset > this.currentCamTiltOffset
            ? CAM_TILT_LERP_SPEED
            : CAM_RECOVER_LERP_SPEED;

        this.currentCamTiltOffset = this.currentCamTiltOffset
            + (this.targetCamTiltOffset - this.currentCamTiltOffset) * math.clamp(dt * lerpSpeed, 0, 1);

        if (math.abs(this.currentCamTiltOffset) > 0.01) {
            this.camera.CFrame = this.camera.CFrame.mul(
                CFrame.Angles(math.rad(-this.currentCamTiltOffset), 0, 0),
            );
        }
    }

    stop() {
        this.charAddedConn?.Disconnect();
        this.renderConn?.Disconnect();
        this.stateChangedConn?.Disconnect();
    }
}