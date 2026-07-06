import { Workspace, Players, SoundService } from "@rbxts/services";
import Remotes from "shared/remotes";

const ReadyUpRemote = Remotes.Client.Get("readyUp");
const StartGameRemote = Remotes.Client.Get("startGame");

const parentPart = Workspace.WaitForChild("readyUp") as BasePart;
const parentPartGui = parentPart.WaitForChild("SurfaceGui") as SurfaceGui;
const readyButton = parentPartGui.WaitForChild("TextButton") as TextButton;

const camerapart = Workspace.WaitForChild("MenuCam") as BasePart;
const cameraLight = camerapart.WaitForChild("PointLight") as PointLight;



export class handleReady {

    private toggleState = false;

    start() {
        
        readyButton.MouseButton1Click.Connect(() => {
            const player = Players.LocalPlayer;
            ReadyUpRemote.SendToServer("");
            
            this.toggleState = !this.toggleState;
            if (this.toggleState) {
                readyButton.Text = "Ready!";
                cameraLight.Color = Color3.fromRGB(0, 255, 0);
            } else {
                readyButton.Text = "Ready up";
                cameraLight.Color = Color3.fromRGB(255, 255, 255);
            }

        });

        StartGameRemote.Connect(() => {
            const player = Players.LocalPlayer;

            const gui = player.FindFirstChild("PlayerGui") as PlayerGui;
            const fadeGui = gui.WaitForChild("black") as ScreenGui;
            const frame = fadeGui.WaitForChild("Frame") as Frame;
            
            frame.Visible = true;
            frame.Transparency = 0;

            player.SetAttribute("gameStarted", true);
            
            SoundService.FindFirstChildWhichIsA("Sound")?.Play();

            const fadeDuration = 2;
            const fadeSteps = 20;
            const stepDuration = fadeDuration / fadeSteps;

            for (let i = 0; i < fadeSteps; i++) {
                task.wait(stepDuration);
                frame.Transparency += 1 / fadeSteps;
            }

            frame.Transparency = 1;
            frame.Visible = false;


        });
    
    }
}