// client/PickupClient.ts
import { Players, RunService, UserInputService, Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const pickupRemote = Remotes.Client.Get("pickupObject");
const dropRemote = Remotes.Client.Get("dropObject");
const interactRemote = Remotes.Client.Get("interactObject");
const heldChangedRemote = Remotes.Client.Get("objectHeldChanged");
const confirmRemote = Remotes.Client.Get("confirmPlace");
const cancelRemote = Remotes.Client.Get("cancelPlace");
const placeGhostChanged = Remotes.Client.Get("placeGhostChanged");

const MAX_LOOK_DISTANCE = 15;
const PLACE_LERP_SPEED = 18;

export class PickupClient {
    private player = Players.LocalPlayer;
    private camera = Workspace.CurrentCamera!;

    private currentHighlight?: Highlight;
    private highlightedTarget?: Instance;

    private locallyHeldTarget?: Instance;
    private remoteHeldTargets = new Map<Player, Instance>();

    private inPlaceMode = false;
    private placeGhost?: Instance;
    private hiddenGhostParts = new Array<BasePart>();
    private hiddenBoxParts = new Array<BasePart>();

    private renderConn?: RBXScriptConnection;
    private inputConn?: RBXScriptConnection;
    private heldChangedConn?: RBXScriptConnection;
    private placeGhostConn?: RBXScriptConnection;

    start() {
        this.renderConn = RunService.RenderStepped.Connect((dt) => {
            this.updateLocalDrag();
            this.updatePlaceMode(dt);
            this.updateHighlight();
        });

        this.inputConn = UserInputService.InputBegan.Connect((input, processed) => {
            if (processed) return;

            if (input.KeyCode === Enum.KeyCode.E) {
                if (!this.inPlaceMode) {
                    this.onPressE();
                }
            } else if (input.UserInputType === Enum.UserInputType.MouseButton2) {
                if (this.inPlaceMode) {
                    this.inPlaceMode = false;
                    cancelRemote.SendToServer();
                } else if (this.locallyHeldTarget) {
                    interactRemote.SendToServer();
                }
            } else if (input.UserInputType === Enum.UserInputType.MouseButton1) {
                if (this.inPlaceMode && this.placeGhost) {
                    const primary = this.placeGhost.IsA("BasePart")
                        ? this.placeGhost
                        : this.placeGhost.IsA("Model")
                        ? (this.placeGhost.PrimaryPart ?? this.placeGhost.FindFirstChildWhichIsA("BasePart") as BasePart | undefined)
                        : undefined;
                    if (primary) {
                        this.inPlaceMode = false;
                        confirmRemote.SendToServer(primary.CFrame);
                    }
                }
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

        this.placeGhostConn = placeGhostChanged.Connect((ghost, placer) => {
            if (ghost) {
                if (placer !== this.player) {
                    for (const child of ghost.GetDescendants()) {
                        if (child.IsA("BasePart")) {
                            child.LocalTransparencyModifier = 1;
                            this.hiddenGhostParts.push(child);
                        }
                    }
                    if (ghost.IsA("BasePart")) {
                        ghost.LocalTransparencyModifier = 1;
                        this.hiddenGhostParts.push(ghost);
                    }
                }
                this.placeGhost = ghost;
                if (placer === this.player) {
                    this.inPlaceMode = true;
                    if (this.locallyHeldTarget) {
                        for (const child of this.locallyHeldTarget.GetDescendants()) {
                            if (child.IsA("BasePart")) {
                                child.LocalTransparencyModifier = 1;
                                this.hiddenBoxParts.push(child);
                            }
                        }
                        if (this.locallyHeldTarget.IsA("BasePart")) {
                            this.locallyHeldTarget.LocalTransparencyModifier = 1;
                            this.hiddenBoxParts.push(this.locallyHeldTarget);
                        }
                    }
                }
            } else {
                for (const part of this.hiddenGhostParts) {
                    part.LocalTransparencyModifier = 0;
                }
                this.hiddenGhostParts.clear();
                for (const part of this.hiddenBoxParts) {
                    part.LocalTransparencyModifier = 0;
                }
                this.hiddenBoxParts.clear();
                this.placeGhost = undefined;
                this.inPlaceMode = false;
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
        if (this.inPlaceMode) return;

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

    private updatePlaceMode(dt: number) {
        if (!this.inPlaceMode || !this.placeGhost || !this.placeGhost.Parent) return;

        const character = this.player.Character;
        if (!character) return;
        const rootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!rootPart) return;

        const origin = rootPart.Position;
        const forward = rootPart.CFrame.LookVector.mul(5);
        const checkOrigin = new Vector3(origin.X + forward.X, origin.Y, origin.Z + forward.Z);

        const raycastParams = new RaycastParams();
        raycastParams.FilterType = Enum.RaycastFilterType.Exclude;
        raycastParams.FilterDescendantsInstances = [character, this.placeGhost];

        const ray = Workspace.Raycast(checkOrigin, new Vector3(0, -200, 0), raycastParams);
        let groundY = origin.Y - 3;
        if (ray && origin.Y - ray.Position.Y <= 10) {
            groundY = ray.Position.Y;
        }

        const primary = this.placeGhost.IsA("BasePart")
            ? this.placeGhost
            : this.placeGhost.IsA("Model")
            ? (this.placeGhost.PrimaryPart ?? this.placeGhost.FindFirstChildWhichIsA("BasePart") as BasePart | undefined)
            : undefined;

        if (!primary) return;

        const halfHeight = primary.Size.Y / 2;
        const targetCFrame = new CFrame(new Vector3(checkOrigin.X, groundY + halfHeight, checkOrigin.Z));
        const alpha = math.clamp(dt * PLACE_LERP_SPEED, 0, 1);

        if (this.placeGhost.IsA("BasePart")) {
            this.placeGhost.CFrame = this.placeGhost.CFrame.Lerp(targetCFrame, alpha);
        } else if (this.placeGhost.IsA("Model")) {
            this.placeGhost.PrimaryPart = primary;
            this.placeGhost.SetPrimaryPartCFrame(primary.CFrame.Lerp(targetCFrame, alpha));
        }
    }

    private updateHighlight() {
        if (this.locallyHeldTarget || this.inPlaceMode) {
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

    stop() {
        this.renderConn?.Disconnect();
        this.inputConn?.Disconnect();
        this.heldChangedConn?.Disconnect();
        this.placeGhostConn?.Disconnect();
        this.clearHighlight();
    }
}
