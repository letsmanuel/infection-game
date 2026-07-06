import { Players, SoundService, Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const checkAvailability = Remotes.Client.Get("checkOrderAvailability");
const availabilityResponse = Remotes.Client.Get("orderAvailabilityResponse");

function playSound(sound?: Sound) {
    if (!sound) return;
    sound.Stop();
    sound.Play();
}

export class OldShopHandler {

    private savedWalkSpeed = 0;
    private savedJumpPower = 0;

    start() {
        const player = Players.LocalPlayer;
        const playerGUI = player.WaitForChild("PlayerGui") as PlayerGui;
        const shopGUI = playerGUI.WaitForChild("order") as ScreenGui;
        const oldFrame = shopGUI.WaitForChild("old") as Frame;
        const closeButton = oldFrame.WaitForChild("closeShop") as ImageButton;
        const purchaseButton = oldFrame.WaitForChild("purchaseNow") as ImageButton;
        const buttonsHolder = oldFrame.WaitForChild("itemsList") as ScrollingFrame;

        const phoneBeep = SoundService.FindFirstChild("phonebeep") as Sound | undefined;
        const callEnd = SoundService.FindFirstChild("callend") as Sound | undefined;
        const callFailure = SoundService.FindFirstChild("callfailure") as Sound | undefined;

        let selectedFrame: Frame | undefined;
        let selectedStroke: UIStroke | undefined;
        let pendingResponseConn: RBXScriptConnection | undefined;

        const clearSelection = () => {
            if (selectedStroke) {
                selectedStroke.Destroy();
                selectedStroke = undefined;
            }
            selectedFrame = undefined;
        };

        const selectFrame = (frame: Frame) => {
            playSound(phoneBeep);

            if (selectedFrame === frame) {
                clearSelection();
                return;
            }

            clearSelection();

            const stroke = new Instance("UIStroke");
            stroke.Color = new Color3(1, 1, 1);
            stroke.Thickness = 2;
            stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
            stroke.Parent = frame;

            selectedFrame = frame;
            selectedStroke = stroke;
        };

        for (const child of buttonsHolder.GetChildren()) {
            if (child.IsA("Frame")) {
                const interactButton = child.FindFirstChild("INTERACT") as TextButton | undefined;
                if (interactButton) {
                    interactButton.MouseButton1Click.Connect(() => {
                        selectFrame(child);
                    });
                }
            }
        }

        const doOpenShop = () => {
            oldFrame.Visible = true;
            player.SetAttribute("_shopOpen", true);

            const char = player.Character;
            if (char) {
                const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
                if (humanoid) {
                    this.savedWalkSpeed = humanoid.WalkSpeed;
                    this.savedJumpPower = humanoid.JumpPower;
                    humanoid.WalkSpeed = 0;
                    humanoid.JumpPower = 0;
                }
            }
        };

        const tryOpenShop = () => {
            const role = player.GetAttribute("role") as string | undefined;
            if (role === "Attacker") return;
            if (pendingResponseConn) return;

            pendingResponseConn = availabilityResponse.Connect((available) => {
                pendingResponseConn?.Disconnect();
                pendingResponseConn = undefined;

                if (available) {
                    doOpenShop();
                } else {
                    playSound(callFailure);
                }
            });

            checkAvailability.SendToServer();
        };

        const closeShop = () => {
            playSound(callEnd);
            oldFrame.Visible = false;
            clearSelection();
            player.SetAttribute("_shopOpen", false);

            const char = player.Character;
            if (char) {
                const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
                if (humanoid) {
                    humanoid.WalkSpeed = this.savedWalkSpeed;
                    humanoid.JumpPower = this.savedJumpPower;
                }
            }
        };

        closeButton.MouseButton1Click.Connect(() => {
            playSound(phoneBeep);
            closeShop();
        });

        purchaseButton.MouseButton1Click.Connect(() => {
            if (selectedFrame) {
                playSound(phoneBeep);
                Remotes.Client.Get("placeOrder").SendToServer(selectedFrame.Name);
                closeShop();
            }
        });

        const updateLandlinePrompts = () => {
            const role = player.GetAttribute("role") as string | undefined;
            const isAttacker = role === "Attacker";
            for (const child of Workspace.GetDescendants()) {
                if (child.IsA("ProximityPrompt") && child.Name === "landlinePrompt") {
                    child.Enabled = !isAttacker;
                }
            }
        };

        updateLandlinePrompts();

        player.GetAttributeChangedSignal("role").Connect(() => {
            updateLandlinePrompts();
        });

        for (const child of Workspace.GetDescendants()) {
            if (child.IsA("ProximityPrompt") && child.Name === "landlinePrompt") {
                child.Triggered.Connect((playerWhoTriggered) => {
                    if (playerWhoTriggered === player) {
                        tryOpenShop();
                    }
                });
            }
        }
    }
}
