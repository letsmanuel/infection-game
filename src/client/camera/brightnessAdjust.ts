// BrightnessAdjustModule.ts
import { Players, RunService, Workspace, Lighting } from "@rbxts/services";

const BRIGHT_COLOR = Color3.fromRGB(68, 68, 68); // fully adjusted / indoor brightness
const DARK_COLOR = Color3.fromRGB(44, 44, 44); // freshly-exited-bright-area darkness

const ADJUST_DURATION = 10; // seconds to adjust from dark back to bright
const CHECK_INTERVAL = 0.2; // how often to check zone overlap

export class BrightnessAdjustModule {
    private player = Players.LocalPlayer;

    private indoorFolder?: Folder;
    private rootPart?: BasePart;

    private wasIndoor = false;
    private adjusting = false;
    private adjustTimer = 0;

    private currentAmbient = BRIGHT_COLOR;

    private charAddedConn?: RBXScriptConnection;
    private heartbeatConn?: RBXScriptConnection;
    private lastCheck = 0;

    start() {
        this.indoorFolder = Workspace.WaitForChild("TriggerZones").WaitForChild("Indoor") as Folder;
        print("Indoor folder found:", this.indoorFolder.GetFullName());
        const setup = (char: Model) => {
            this.rootPart = char.WaitForChild("HumanoidRootPart") as BasePart;
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        // Assume we start "indoor"/bright so there's no false adjustment on spawn
        this.wasIndoor = true;
        this.currentAmbient = BRIGHT_COLOR;
        Lighting.Ambient = this.currentAmbient;

        this.heartbeatConn = RunService.Heartbeat.Connect((dt) => {
            this.update(dt);
        });
    }

    private isIndoor(): boolean {
        if (!this.rootPart || !this.indoorFolder) return false;

        const zones = this.indoorFolder.GetChildren().filter((c) => c.IsA("BasePart")) as BasePart[];
        if (zones.size() === 0) return false;

        const overlapParams = new OverlapParams();
        overlapParams.FilterType = Enum.RaycastFilterType.Include;
        overlapParams.FilterDescendantsInstances = [this.rootPart];

        for (const zone of zones) {
            const touchingParts = Workspace.GetPartsInPart(zone, overlapParams);
            if (touchingParts.size() > 0) {
                return true;
            }
        }

        return false;
    }

    private update(dt: number) {
        this.lastCheck += dt;
        if (this.lastCheck >= CHECK_INTERVAL) {
            this.lastCheck = 0;

            const nowIndoor = this.isIndoor();

            if (nowIndoor && !this.wasIndoor) {
                // Entered a bright area: snap to bright immediately, no adjustment needed
                print("Entered bright area, snapping to bright");
                this.adjusting = false;
                this.currentAmbient = BRIGHT_COLOR;
                Lighting.Ambient = this.currentAmbient;
            } else if (!nowIndoor && this.wasIndoor) {
                // Left a bright area into the dark: start dark, begin adjusting
                print("Left bright area, starting dark and adjusting");
                this.currentAmbient = DARK_COLOR;
                Lighting.Ambient = this.currentAmbient;
                this.adjusting = true;
                this.adjustTimer = 0;
            }

            this.wasIndoor = nowIndoor;
        }

        if (this.adjusting) {
            this.adjustTimer += dt;
            const alpha = math.clamp(this.adjustTimer / ADJUST_DURATION, 0, 1);

            this.currentAmbient = DARK_COLOR.Lerp(BRIGHT_COLOR, alpha);
            Lighting.Ambient = this.currentAmbient;

            if (alpha >= 1) {
                this.adjusting = false;
            }
        }
    }

    stop() {
        this.charAddedConn?.Disconnect();
        this.heartbeatConn?.Disconnect();
    }
}