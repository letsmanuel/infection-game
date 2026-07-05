// client/PickupClient.ts
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const pickupRemote = Remotes.Client.Get("pickupObject");
const dropRemote = Remotes.Client.Get("dropObject");
const interactRemote = Remotes.Client.Get("interactObject");
const heldChangedRemote = Remotes.Client.Get("objectHeldChanged");

const MAX_LOOK_DISTANCE = 15;

export class PickupClient {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;

    private currentHighlight?: Highlight;
    private highlightedTarget?: Instance;

    private locallyHeldTarget?: Instance;
    private remoteHeldTargets = new Map<Player, Instance>();

    private renderConn?: RBXScriptConnection;
    private inputConn?: RBXScriptConnection;
    private heldChangedConn?: RBXScriptConnection;

    start() {
        this.renderConn = RunService.RenderStepped.Connect(() => {
            this.updateLocalDrag();
            this.updateHighlight();
        });

        this.inputConn = UserInputService.InputBegan.Connect((input, processed) => {
            if (processed) return;

            if (input.KeyCode === Enum.KeyCode.E) {
                this.onPressE();
            } else if (input.UserInputType === Enum.UserInputType.MouseButton2) {
                this.onRightClick();
            }
        });

        this.heldChangedConn = heldChangedRemote.Connect((holder, target) => {
            if (target) {
                this.remoteHeldTargets.set(holder, target);
            } else {
                this.remoteHeldTargets.delete(holder);
            }

            if (holder === this.player) {
                this.locallyHeldTarget = target;
            }
        });
    }

    private getLookTarget(): Instance | undefined {
        const character = this.player.Character;
        if (!character) return undefined;

        const origin = this.camera.CFrame.Position;
        const direction = this.camera.CFrame.LookVector.mul(MAX_LOOK_DISTANCE);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [character];

        const result = Workspace.Raycast(origin, direction, raycastParams);
        if (!result) return undefined;

        const hitInstance = result.Instance;

        if (hitInstance.Parent && hitInstance.Parent.IsA("Model") && hitInstance.Parent.GetAttribute("pickupable") === true) {
            return hitInstance.Parent;
        }

        return hitInstance;
    }

    private updateLocalDrag() {
        if (!this.locallyHeldTarget) return;

        const character = this.player.Character;
        if (!character) return;
        const rootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!rootPart) return;

        const targetCFrame = rootPart.CFrame.mul(
            new CFrame(new Vector3(0, -0.5, -3)),
        );

        if (this.locallyHeldTarget.IsA("BasePart")) {
            this.locallyHeldTarget.CFrame = targetCFrame;
        } else if (this.locallyHeldTarget.IsA("Model")) {
            const primary = this.locallyHeldTarget.PrimaryPart ?? this.locallyHeldTarget.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
            if (primary) {
                this.locallyHeldTarget.PrimaryPart = primary;
                this.locallyHeldTarget.SetPrimaryPartCFrame(targetCFrame);
            }
        }
    }

    private updateHighlight() {
        if (this.locallyHeldTarget) {
            this.clearHighlight();
            return;
        }

        const target = this.getLookTarget();

        if (!target || target.GetAttribute("pickupable") !== true || this.isHeldByAnyone(target)) {
            this.clearHighlight();
            return;
        }

        if (target === this.highlightedTarget) return;

        this.clearHighlight();

        const highlight = new Instance("Highlight");
        highlight.FillTransparency = 0.5;
        highlight.OutlineTransparency = 0;
        highlight.Adornee = target;
        highlight.Parent = target;

        this.currentHighlight = highlight;
        this.highlightedTarget = target;
    }

    private isHeldByAnyone(target: Instance): boolean {
        for (const [, held] of this.remoteHeldTargets) {
            if (held === target) return true;
        }
        return false;
    }

    private clearHighlight() {
        this.currentHighlight?.Destroy();
        this.currentHighlight = undefined;
        this.highlightedTarget = undefined;
    }

    private onPressE() {
        if (this.locallyHeldTarget) {
            this.locallyHeldTarget = undefined;
            dropRemote.SendToServer();
            return;
        }

        const target = this.highlightedTarget;
        if (!target) return;

        pickupRemote.SendToServer(target);
    }

    private onRightClick() {
        if (!this.locallyHeldTarget) return;
        interactRemote.SendToServer();
    }

    stop() {
        this.renderConn?.Disconnect();
        this.inputConn?.Disconnect();
        this.heldChangedConn?.Disconnect();
        this.clearHighlight();
    }
}