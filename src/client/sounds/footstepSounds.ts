// client/FootstepsClient.ts
import { Players, SoundService } from "@rbxts/services";
import { FootstepSoundList } from "shared/configs/footstepdata";
import Remotes, { RemoteId } from "shared/remotes";

export class FootstepsClient {
    private player = Players.LocalPlayer;
    private humanoid?: Humanoid;
    private currentSound?: Sound;
    private material?: string;

    start() {
        const character = this.player.Character ?? this.player.CharacterAdded.Wait()[0];
        this.setupCharacter(character);

        this.player.CharacterAdded.Connect((char) => {
            this.setupCharacter(char);
        });
    }

    private setupCharacter(character: Model) {
        this.humanoid = character.WaitForChild("Humanoid") as Humanoid;
        const root = character.WaitForChild("HumanoidRootPart") as BasePart;

        const defaultRunningSound = root.FindFirstChild("Running");
        if (defaultRunningSound) defaultRunningSound.Destroy();

        this.currentSound = new Instance("Sound");
        this.currentSound.Name = "CurrentSound";
        this.currentSound.Parent = SoundService;

        this.updateFloorMaterial();
        this.applySoundProperties();

        this.humanoid.GetPropertyChangedSignal("FloorMaterial").Connect(() => {
            this.updateFloorMaterial();
            this.applySoundProperties();
            if (this.humanoid && this.humanoid.MoveDirection.Magnitude > 0 && this.currentSound) {
                this.currentSound.Playing = true;
            }
        });

        this.humanoid.GetPropertyChangedSignal("WalkSpeed").Connect(() => {
            if (this.humanoid) {
                Remotes.Client.Get(RemoteId.updateWalkSpeed).SendToServer(this.humanoid.WalkSpeed);
            }
        });

        this.humanoid.Running.Connect((speed) => {
            this.onRunning(speed);
        });

        const serverSound = root.WaitForChild("CurrentSound") as Sound;
        serverSound.GetPropertyChangedSignal("Volume").Connect(() => {
            if (serverSound.Volume !== 0) {
                serverSound.Volume = 0;
            }
        });

        this.player.CharacterAdded.Connect(() => {
            task.wait(1);
            if (this.currentSound && this.currentSound.IsPlaying) {
                this.currentSound.Stop();
            }
        });
    }

    private updateFloorMaterial() {
        if (!this.humanoid) return;
        this.material = this.humanoid.FloorMaterial.Name;
    }

    private applySoundProperties() {
        if (!this.humanoid || !this.currentSound || !this.material) return;
        const data = FootstepSoundList[this.material];
        if (!data) return;

        this.currentSound.SoundId = data.id;
        this.currentSound.Volume = data.volume;
        this.currentSound.PlaybackSpeed = (this.humanoid.WalkSpeed / 16) * data.speed;
    }

    private onRunning(speed: number) {
        if (!this.humanoid || !this.currentSound) return;

        const isDead = this.player.GetAttribute("_dead") === true;
        const isMoving = this.humanoid.MoveDirection.Magnitude > 0;
        const isClimbing = this.humanoid.GetState() === Enum.HumanoidStateType.Climbing;

        if (isMoving && speed > 0 && !isClimbing && !isDead) {
            this.applySoundProperties();
            this.currentSound.Playing = true;
            this.currentSound.Looped = true;
        } else {
            this.currentSound.Stop();
        }
    }
}
