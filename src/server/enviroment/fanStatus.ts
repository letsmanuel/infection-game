import { Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const RUN_TIME = 15;
const COOLDOWN_TIME = 45;

export class FanStatus {

    private fanModeValue = Workspace.WaitForChild("fanMode") as StringValue;
    private fanCooldownValue = Workspace.WaitForChild("fanCooldown") as NumberValue;
    private fanRemote = Remotes.Server.Get("startupFan");
    private fanLabel = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("fan").WaitForChild("Motor").WaitForChild("status").WaitForChild("TextLabel") as TextLabel;

    start() {
        this.fanRemote.Connect((player) => {
            if (this.fanModeValue.Value !== "idle") {
                return;
            }
            this.activate();
        });
    }

    private activate() {
        this.fanModeValue.Value = "active";

        task.spawn(() => {
            this.countdown(RUN_TIME, "Running");

            this.fanModeValue.Value = "cooldown";
            this.fanCooldownValue.Value = os.time() + COOLDOWN_TIME;
            this.countdown(COOLDOWN_TIME, "Cooldown");

            this.fanModeValue.Value = "idle";
            this.fanCooldownValue.Value = 0;
            this.fanLabel.Text = "";
        });
    }

    private countdown(seconds: number, prefix: string) {
        for (let remaining = seconds; remaining > 0; remaining--) {
            this.fanLabel.Text = `${prefix}: ${remaining}`;
            task.wait(1);
        }
    }

}