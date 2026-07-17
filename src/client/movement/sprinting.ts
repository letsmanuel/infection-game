import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";

const WALK_SPEED = 16;
const SPRINT_SPEED = 26;
const ATTACKER_START_SPEED = 10;
const ATTACKER_RAMP_TIME = 10;
const SPRINT_FOV_BOOST = 8;
const STUN_SPEED = 5;
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

    private attackerStartTime = 0;

    private setupAttacker = () => {
        const isAttacker = this.player.GetAttribute("role") === "Attacker";
        if (isAttacker && this.humanoid) {
            this.attackerStartTime = os.clock();
            this.humanoid.WalkSpeed = ATTACKER_START_SPEED;
        } else if (!isAttacker && this.humanoid) {
            this.humanoid.WalkSpeed = WALK_SPEED;
        }
    };

    start() {
        this.player.SetAttribute("_sprinting", false);

        const setup = (char: Model) => {
            this.humanoid = char.WaitForChild("Humanoid") as Humanoid;
            this.setupAttacker();
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        this.player.GetAttributeChangedSignal("role").Connect(() => {
            this.setupAttacker();
        });

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
            this.updateAttackerRamp();
        });
    }

    private attackerFrameCount = 0;

    private updateAttackerRamp() {
        if (!this.humanoid) { return; }
        if (this.player.GetAttribute("role") !== "Attacker") { return; }
        if (this.sprinting) { return; }
        if (this.player.GetAttribute("_crouching") === true) { return; }

        if (this.player.GetAttribute("_stunned") === true) {
            this.humanoid.WalkSpeed = STUN_SPEED;
            return;
        }

        const isMoving = this.humanoid.MoveDirection.Magnitude > 0.1;

        if (!isMoving) {
            this.attackerStartTime = os.clock();
            this.humanoid.WalkSpeed = ATTACKER_START_SPEED;
            return;
        }

        const elapsed = os.clock() - this.attackerStartTime;
        if (elapsed >= ATTACKER_RAMP_TIME) {
            this.humanoid.WalkSpeed = SPRINT_SPEED;
            return;
        }

        const t = elapsed / ATTACKER_RAMP_TIME;
        const speed = ATTACKER_START_SPEED + (SPRINT_SPEED - ATTACKER_START_SPEED) * t;
        this.humanoid.WalkSpeed = speed;

        this.attackerFrameCount += 1;
        if (this.attackerFrameCount % 60 === 0) {
            print(`[Sprint] RAMP | elapsed=${"%.1f".format(elapsed)}s t=${"%.2f".format(t)} speed=${"%.1f".format(speed)} walkSpeed=${"%.1f".format(this.humanoid.WalkSpeed)}`);
        }
    }

    setSprinting(value: boolean) {
        if (!this.humanoid) return;
        if (this.player.GetAttribute("role") === "Attacker") {
            print(`[Sprint] setSprinting BLOCKED for attacker | value=${value}`);
            return;
        }

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