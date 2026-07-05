import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";

const WALK_SPEED = 16;
const SPRINT_SPEED = 26;
const SPRINT_FOV_BOOST = 8;
const FOV_LERP_SPEED = 6;

export class SprintModule {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;
    private humanoid?: Humanoid;
    private baseFov = 60;

    private sprinting = false;
    private sprintKey = Enum.KeyCode.LeftShift;

    private inputBeganConn?: RBXScriptConnection;
    private inputEndedConn?: RBXScriptConnection;
    private renderConn?: RBXScriptConnection;
    private charAddedConn?: RBXScriptConnection;

    start() {
        this.player.SetAttribute("_sprinting", false);

        const setup = (char: Model) => {
            this.humanoid = char.WaitForChild("Humanoid") as Humanoid;
            this.humanoid.WalkSpeed = WALK_SPEED;
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        this.inputBeganConn = UserInputService.InputBegan.Connect((input, processed) => {
            if (processed) return;
            if (input.KeyCode === this.sprintKey) {
                this.setSprinting(true);
            }
        });

        this.inputEndedConn = UserInputService.InputEnded.Connect((input) => {
            if (input.KeyCode === this.sprintKey) {
                this.setSprinting(false);
            }
        });

        this.renderConn = RunService.RenderStepped.Connect((dt) => {
            this.update(dt);
        });
    }

    setSprinting(value: boolean) {
        if (!this.humanoid) return;

        if (value && this.player.GetAttribute("_crouching") === true) {
            return;
        }

        this.sprinting = value;
        this.player.SetAttribute("_sprinting", value);
        this.humanoid.WalkSpeed = value ? SPRINT_SPEED : WALK_SPEED;
    }

    isSprinting() {
        return this.sprinting;
    }

    private update(dt: number) {
        const targetFov = this.sprinting ? this.baseFov + SPRINT_FOV_BOOST : this.baseFov;
        this.camera.FieldOfView = math.clamp(
            this.camera.FieldOfView + (targetFov - this.camera.FieldOfView) * math.clamp(dt * FOV_LERP_SPEED, 0, 1),
            1,
            120,
        );
    }

    stop() {
        this.inputBeganConn?.Disconnect();
        this.inputEndedConn?.Disconnect();
        this.renderConn?.Disconnect();
        this.charAddedConn?.Disconnect();
        this.setSprinting(false);
    }
}