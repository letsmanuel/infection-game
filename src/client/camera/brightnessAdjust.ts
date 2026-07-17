// BrightnessAdjustModule.ts
import { Players, RunService, Workspace, Lighting } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const BRIGHT_COLOR = Color3.fromRGB(68, 68, 68);
const DARK_COLOR = Color3.fromRGB(44, 44, 44);
const POWER_OUTAGE_COLOR = Color3.fromRGB(22, 22, 22);

const ADJUST_DURATION = 10;
const CHECK_INTERVAL = 0.2;

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

    private powerOutage = false;

    start() {
        this.indoorFolder = Workspace.WaitForChild("TriggerZones").WaitForChild("Indoor") as Folder;
        print("Indoor folder found:", this.indoorFolder.GetFullName());
        const setup = (char: Model) => {
            this.rootPart = char.WaitForChild("HumanoidRootPart") as BasePart;
        };

        if (this.player.Character) setup(this.player.Character);
        this.charAddedConn = this.player.CharacterAdded.Connect(setup);

        this.wasIndoor = true;
        this.currentAmbient = BRIGHT_COLOR;
        Lighting.Ambient = this.currentAmbient;

        Remotes.Client.Get(RemoteId.powerOutageMainStart).Connect(() => {
            task.wait(0.2);
            this.powerOutage = true;
            Lighting.Ambient = POWER_OUTAGE_COLOR;
            Lighting.EnvironmentDiffuseScale = 1;
            Lighting.EnvironmentSpecularScale = 1;
        });

        Remotes.Client.Get(RemoteId.powerOutageState).Connect((active) => {
            if (!active) {
                this.powerOutage = false;
                this.currentAmbient = BRIGHT_COLOR;
                Lighting.Ambient = BRIGHT_COLOR;
                this.adjusting = false;
            }
        });

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
        if (this.powerOutage) return;

        this.lastCheck += dt;
        if (this.lastCheck >= CHECK_INTERVAL) {
            this.lastCheck = 0;

            const nowIndoor = this.isIndoor();

            if (nowIndoor && !this.wasIndoor) {
                print("Entered bright area, snapping to bright");
                this.adjusting = false;
                this.currentAmbient = BRIGHT_COLOR;
                Lighting.Ambient = this.currentAmbient;

                Lighting.EnvironmentDiffuseScale = .6;
                Lighting.EnvironmentSpecularScale = 0;

            } else if (!nowIndoor && this.wasIndoor) {
                print("Left bright area, starting dark and adjusting");
                
                Lighting.EnvironmentDiffuseScale = 1; 
                Lighting.EnvironmentSpecularScale = 1;


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