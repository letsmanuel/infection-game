import { Workspace, Players, SoundService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const ReadyUpRemote = Remotes.Client.Get(RemoteId.readyUp);
const StartGameRemote = Remotes.Client.Get(RemoteId.startGame);

const TRANSITION_SOUND_ID = "rbxassetid://128842283247970";

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

            const transitionSound = new Instance("Sound");
            transitionSound.SoundId = TRANSITION_SOUND_ID;
            transitionSound.Volume = 1;
            transitionSound.Parent = SoundService;

            frame.Visible = true;
            frame.Transparency = 1;

            const fadeInTime = 1.5;
            const fadeInSteps = 15;
            const fadeInStepTime = fadeInTime / fadeInSteps;

            for (let i = 1; i <= fadeInSteps; i++) {
                frame.Transparency = 1 - (i / fadeInSteps);
                if (i === 1) {
                    transitionSound.Play();
                }
                task.wait(fadeInStepTime);
            }

            frame.Transparency = 0;

            task.wait(2);

            player.SetAttribute("gameStarted", true);

            const fadeOutTime = 2.5;
            const fadeOutSteps = 25;
            const fadeOutStepTime = fadeOutTime / fadeOutSteps;

            for (let i = 1; i <= fadeOutSteps; i++) {
                frame.Transparency = i / fadeOutSteps;
                task.wait(fadeOutStepTime);
            }

            frame.Transparency = 1;
            frame.Visible = false;
            transitionSound.Destroy();

        });
    
    }
}
