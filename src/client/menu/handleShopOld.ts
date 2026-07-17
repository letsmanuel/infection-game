import { Players, SoundService, Workspace, ReplicatedStorage } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";
import { DeliveryOptions } from "shared/configs/deliveryOptions";

const checkAvailability = Remotes.Client.Get(RemoteId.checkOrderAvailability);
const availabilityResponse = Remotes.Client.Get(RemoteId.orderAvailabilityResponse);

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

        const scrapAmount = ReplicatedStorage.WaitForChild("ScrapAmount") as IntValue;

        const productById = new Map<string, (typeof DeliveryOptions.Products)[number]>();
        for (const product of DeliveryOptions.Products) {
            productById.set(product.id, product);
        }

        const updateCostLabels = () => {
            for (const child of buttonsHolder.GetChildren()) {
                if (!child.IsA("Frame")) continue;
                const product = productById.get(child.Name);
                if (!product) continue;
                const costLabel = child.FindFirstChild("cost") as TextLabel | undefined;
                if (costLabel) {
                    costLabel.Text = `${product.scrapCost} Scrap`;
                }
            }
        };

        updateCostLabels();

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
                const product = productById.get(selectedFrame.Name);
                if (product && scrapAmount.Value < product.scrapCost) {
                    playSound(callFailure);
                    return;
                }
                playSound(phoneBeep);
                Remotes.Client.Get(RemoteId.placeOrder).SendToServer(selectedFrame.Name);
                closeShop();
            }
        });

        const isAttacker = () => player.GetAttribute("role") === "Attacker";

        const handleLandlinePrompt = (prompt: ProximityPrompt) => {
            prompt.Enabled = !isAttacker();

            prompt.Triggered.Connect((playerWhoTriggered) => {
                if (playerWhoTriggered !== player) return;
                if (isAttacker()) return;
                tryOpenShop();
            });
        };

        const updateAllLandlinePrompts = () => {
            for (const child of Workspace.GetDescendants()) {
                if (child.IsA("ProximityPrompt") && child.Name === "landlinePrompt") {
                    child.Enabled = !isAttacker();
                }
            }
        };

        for (const child of Workspace.GetDescendants()) {
            if (child.IsA("ProximityPrompt") && child.Name === "landlinePrompt") {
                handleLandlinePrompt(child);
            }
        }

        Workspace.DescendantAdded.Connect((desc) => {
            if (desc.IsA("ProximityPrompt") && desc.Name === "landlinePrompt") {
                handleLandlinePrompt(desc);
            }
        });

        player.GetAttributeChangedSignal("role").Connect(() => {
            updateAllLandlinePrompts();
        });
    }
}
