import { VERSION } from "@rbxts/net";
import { Workspace, Lighting, Players, RunService } from "@rbxts/services";

const attackerEffectsFolder = Lighting.WaitForChild("attacker") as Folder;
const playerGUI = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;
const grainGui = playerGUI.WaitForChild("grain") as ScreenGui;
const mainGrainFrame = grainGui.WaitForChild("Frame") as Frame;

export class LightningEffectsAttacker {

    private localPlayer = Players.LocalPlayer;
    private framesWaitedCount = 0;
    private renderedImageNow = 1;

    start() {

        type Role = "Attacker" | "Defender";

        Players.LocalPlayer.GetAttributeChangedSignal("role").Connect(() => {
            const role = Players.LocalPlayer.GetAttribute("role") as Role | undefined;
            const isAttacker = role === "Attacker";
            

            if (isAttacker) {

                for (const item of attackerEffectsFolder.GetChildren()) {
                    if (item.IsA("BloomEffect")) {
                        item.Enabled = true
                    }
                }



                RunService.RenderStepped.Connect(() => {

                    Lighting.Brightness = 0;
                    Lighting.Ambient = Color3.fromRGB(0, 11, 71);
                    
                    this.framesWaitedCount += 1;

                    if (this.framesWaitedCount === 3){
                        this.framesWaitedCount = 0;
                        this.renderedImageNow += 1;
                        if (this.renderedImageNow === 5){
                            this.renderedImageNow = 1;
                        }

                        for (const item of mainGrainFrame.GetChildren()) {
                            if (item.Name === tostring(this.renderedImageNow) && item.IsA("ImageLabel")){
                                item.Visible = true
                            }else{
                                if (item.IsA("ImageLabel")){
                                    item.Visible = false
                                }else{
                                    print("tf")
                                }
                            }
                        }
                        mainGrainFrame.Visible = true;
                    } 

                });


            }else{
                mainGrainFrame.Visible = false
                print("skill issue")
                
                for (const item of attackerEffectsFolder.GetChildren()) {
                    if (item.IsA("BloomEffect")) {
                        item.Enabled = false
                    }
                }
            }

        });

    }
}