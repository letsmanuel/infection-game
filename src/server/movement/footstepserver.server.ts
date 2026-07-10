import { Players } from "@rbxts/services";
import { FootstepSoundList } from "shared/configs/footstepdata";
import { UpdateWalkSpeedRemote } from "shared/footstepRemote";

const ROLL_OFF_MIN_DISTANCE = 10;
const ROLL_OFF_MAX_DISTANCE = 75;

class FootstepServerController {
    private humanoid?: Humanoid;
    private currentSound?: Sound;
    private material?: string;

    constructor(private character: Model) {}

    start() {
        this.humanoid = this.character.WaitForChild("Humanoid") as Humanoid;
        const root = this.character.WaitForChild("HumanoidRootPart") as BasePart;

        this.currentSound = new Instance("Sound");
        this.currentSound.Name = "CurrentSound";
        this.currentSound.RollOffMode = Enum.RollOffMode.Linear;
        this.currentSound.RollOffMinDistance = ROLL_OFF_MIN_DISTANCE;
        this.currentSound.RollOffMaxDistance = ROLL_OFF_MAX_DISTANCE;
        this.currentSound.Parent = root;

        this.humanoid.Running.Connect((speed) => {
            this.onRunning(speed);
        });

        task.spawn(() => {
            while (task.wait()) {
                this.pollFloorMaterial();
            }
        });
    }

    private getFloorMaterialName(): string | undefined {
        if (!this.humanoid) return undefined;
        const enumName = this.humanoid.FloorMaterial.Name;
        return enumName;
    }

    private applySoundProperties() {
        if (!this.humanoid || !this.currentSound || !this.material) return;
        const data = FootstepSoundList[this.material];
        if (!data) return;

        this.currentSound.SoundId = data.id;
        this.currentSound.Volume = data.volume;
        this.currentSound.PlaybackSpeed = (this.humanoid.WalkSpeed / 16) * data.speed;
    }

    private pollFloorMaterial() {
        if (!this.humanoid) return;
        const newMaterial = this.getFloorMaterialName();
        if (newMaterial !== this.material) {
            this.material = newMaterial;
            this.applySoundProperties();
        }
    }

    private onRunning(speed: number) {
        if (!this.humanoid || !this.currentSound) return;

        const isMoving = this.humanoid.MoveDirection.Magnitude > 0;
        const isClimbing = this.humanoid.GetState() === Enum.HumanoidStateType.Climbing;

        if (isMoving && speed > 0 && !isClimbing) {
            this.applySoundProperties();
            this.currentSound.Playing = true;
            this.currentSound.Looped = true;
        } else {
            this.currentSound.Stop();
        }
    }
}

Players.PlayerAdded.Connect((player) => {
    player.CharacterAdded.Connect((character) => {
        const controller = new FootstepServerController(character);
        controller.start();
    });
});

UpdateWalkSpeedRemote.OnServerEvent.Connect((player, walkSpeed) => {
    print(`[FootstepServer] WalkSpeed update from ${player.Name}: ${walkSpeed}`);
});

print("Footstep server module loaded!");