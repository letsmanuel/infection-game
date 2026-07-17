import { Workspace } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const RUN_TIME = 15;
const COOLDOWN_TIME = 45;

let instance: FanStatus;

export function getFanStatus(): FanStatus {
	return instance;
}

export class FanStatus {

    private fanModeValue = Workspace.WaitForChild("fanMode") as StringValue;
    private fanCooldownValue = Workspace.WaitForChild("fanCooldown") as NumberValue;
    private fanRemote = Remotes.Server.Get(RemoteId.startupFan);
    private fanLabel = Workspace.WaitForChild("Map").WaitForChild("House").WaitForChild("FunnyStuff").WaitForChild("fan").WaitForChild("Motor").WaitForChild("status").WaitForChild("TextLabel") as TextLabel;
    private cooldownThread?: thread;

    start() {
        instance = this;

        this.fanRemote.Connect((player) => {
            if (this.fanModeValue.Value !== "idle") {
                return;
            }
            this.activate();
        });
    }

    private activate() {
        this.fanModeValue.Value = "active";

        if (this.cooldownThread) {
            task.cancel(this.cooldownThread);
        }

        this.cooldownThread = task.spawn(() => {
            this.countdown(RUN_TIME, "Running");

            this.fanModeValue.Value = "cooldown";
            this.fanCooldownValue.Value = os.time() + COOLDOWN_TIME;
            this.countdown(COOLDOWN_TIME, "Cooldown");

            this.fanModeValue.Value = "idle";
            this.fanCooldownValue.Value = 0;
            this.fanLabel.Text = "";
        });
    }

    public resetCooldown() {
        if (this.cooldownThread) {
            task.cancel(this.cooldownThread);
            this.cooldownThread = undefined;
        }
        this.fanModeValue.Value = "idle";
        this.fanCooldownValue.Value = 0;
        this.fanLabel.Text = "";
        print("[FanStatus] Cooldown reset");
    }

    private countdown(seconds: number, prefix: string) {
        for (let remaining = seconds; remaining > 0; remaining--) {
            this.fanLabel.Text = `${prefix}: ${remaining}`;
            task.wait(1);
        }
    }

}