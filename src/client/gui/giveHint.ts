import { Players, Workspace } from "@rbxts/services"
import Remotes, { RemoteId } from "shared/remotes"


const localPlayer = Players.LocalPlayer
const playerGui = localPlayer.WaitForChild("PlayerGui") as PlayerGui;
const hintGui = playerGui.WaitForChild("hint") as ScreenGui;
const hintLabel = hintGui.WaitForChild("TextLabel") as TextLabel;

export default class GiveHintHandler {

    lastShownHint = "";

    start(){
        Remotes.Client.Get(RemoteId.giveClientHint).Connect((hint: string) => {

            this.lastShownHint = hint;
            hintLabel.Visible = true;
            hintLabel.Text = hint;

            task.wait(3)
            
            if (this.lastShownHint === hint){
                hintLabel.Text = "";
                hintLabel.Visible = false;
            }

        });
    }


}