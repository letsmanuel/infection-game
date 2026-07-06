// CrouchModule.ts
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";

const STAND_WALK_SPEED = 16;
const SPRINT_WALK_SPEED = 26;
const CROUCH_WALK_SPEED = 6;

const STAND_CAM_Y = 0;
const CROUCH_CAM_Y = -1.5;
const CAM_LERP_SPEED = 8;

export class CrouchModule {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;
    private humanoid?: Humanoid;

    private crouching = false;
    private crouchKey = Enum.KeyCode.LeftControl;
    private toggleMode = false;

    private wasSprintingBeforeCrouch = false;
    private currentCamYOffset = 0;

    private inputBeganConn?: RBXScriptConnection;
    private inputEndedConn?: RBXScriptConnection;
    private renderConn?: RBXScriptConnection;
    private charAddedConn?: RBXScriptConnection;

    start() {
        this.player.SetAttribute("_crouching", false);

        const setup = (char: Model) => {
            this.humanoid = char.WaitForChild("Humanoid") as Humanoid;
            this.humanoid.WalkSpeed = STAND_WALK_SPEED;
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        this.inputBeganConn = UserInputService.InputBegan.Connect((input, processed) => {
            if (processed) return;
            if (input.KeyCode === this.crouchKey) {
                if (this.toggleMode) {
                    this.setCrouching(!this.crouching);
                } else {
                    this.setCrouching(true);
                }
            }
        });

        this.inputEndedConn = UserInputService.InputEnded.Connect((input) => {
            if (input.KeyCode === this.crouchKey && !this.toggleMode) {
                this.setCrouching(false);
            }
        });

        this.renderConn = RunService.RenderStepped.Connect((dt) => {
            this.update(dt);
        });
    }

    setCrouching(value: boolean) {
        if (!this.humanoid) return;

        this.crouching = value;
        this.player.SetAttribute("_crouching", value);
        this.humanoid.WalkSpeed = value ? CROUCH_WALK_SPEED : STAND_WALK_SPEED;

        if (value) {
            if (this.player.GetAttribute("_sprinting") === true) {
                this.wasSprintingBeforeCrouch = true;
                this.player.SetAttribute("_sprinting", false);
            }
        } else if (this.wasSprintingBeforeCrouch) {
            this.wasSprintingBeforeCrouch = false;
            this.player.SetAttribute("_sprinting", true);
            this.humanoid.WalkSpeed = SPRINT_WALK_SPEED;
        }
    }

    isCrouching() {
        return this.crouching;
    }

    private update(dt: number) {
        if (this.player.GetAttribute("_rigCameraActive") === true) return;
        const targetY = this.crouching ? CROUCH_CAM_Y : STAND_CAM_Y;
        this.currentCamYOffset += (targetY - this.currentCamYOffset) * math.clamp(dt * CAM_LERP_SPEED, 0, 1);

        this.camera.CFrame = this.camera.CFrame.mul(new CFrame(new Vector3(0, this.currentCamYOffset, 0)));
    }

    stop() {
        this.inputBeganConn?.Disconnect();
        this.inputEndedConn?.Disconnect();
        this.renderConn?.Disconnect();
        this.charAddedConn?.Disconnect();
        this.setCrouching(false);
    }
}