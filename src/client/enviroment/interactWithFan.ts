import { Workspace, Players, RunService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const MAX_VIEW_DISTANCE = 15;

export class InteractWithFan {

    private fanProximityPrompt = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("fan").WaitForChild("Propeller").WaitForChild("Handle").WaitForChild("fanInteractObjectTrigger") as ProximityPrompt;
    private fanLabel = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("fan").WaitForChild("Motor").WaitForChild("status").WaitForChild("TextLabel") as TextLabel;
    private fanModeValue = Workspace.WaitForChild("fanMode") as StringValue;
    private fanCooldownValue = Workspace.WaitForChild("fanCooldown") as NumberValue;

        private updatePromptState() {
            const role = Players.LocalPlayer.GetAttribute("role");
            const isAttacker = role === "Attacker";
            const fanState = this.fanModeValue.Value;

            if (isAttacker) {
                this.fanProximityPrompt.Enabled = false;
                this.fanLabel.Visible = false;
                return;
            }

            // Runner: prompt only enabled when ready to trigger
            this.fanProximityPrompt.Enabled = fanState === "idle";

            // Label: never show when idle/ready — only show while running or cooling down, and only in range
            if (fanState === "idle") {
                this.fanLabel.Visible = false;
                return;
            }

            const character = Players.LocalPlayer.Character;
            const root = character?.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
            const handle = this.fanProximityPrompt.Parent as BasePart | undefined;

            if (root && handle) {
                const distance = root.Position.sub(handle.Position).Magnitude;
                this.fanLabel.Visible = distance <= MAX_VIEW_DISTANCE;
            } else {
                this.fanLabel.Visible = false;
            }
        }

    start() {

        const fanRemote = Remotes.Client.Get(RemoteId.startupFan);

        this.fanProximityPrompt.Triggered.Connect((player) => {
            fanRemote.SendToServer();
        });

        Players.LocalPlayer.AttributeChanged.Connect((attributeName) => {
            if (attributeName === "role") {
                this.updatePromptState();
            }
        });

        this.fanModeValue.GetPropertyChangedSignal("Value").Connect(() => {
            this.updatePromptState();
        });

        this.fanCooldownValue.GetPropertyChangedSignal("Value").Connect(() => {
            this.updatePromptState();
        });

        RunService.Heartbeat.Connect(() => {
            this.updatePromptState();
        });

        this.updatePromptState();
    }
}