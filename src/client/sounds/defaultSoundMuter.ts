import { Players } from "@rbxts/services";

const DEFAULT_SOUND_NAMES = ["Running", "Climbing", "Splash", "FreeFalling", "GettingUp", "Jumping", "Landing"];

export class DefaultSoundMuter {
    private player = Players.LocalPlayer;

    start() {
        const character = this.player.Character ?? this.player.CharacterAdded.Wait()[0];
        this.muteCharacterSounds(character);

        this.player.CharacterAdded.Connect((char) => {
            this.muteCharacterSounds(char);
        });
    }

    private muteCharacterSounds(character: Model) {
        const root = character.WaitForChild("HumanoidRootPart") as BasePart;

        for (const name of DEFAULT_SOUND_NAMES) {
            const existing = root.FindFirstChild(name);
            if (existing && existing.IsA("Sound")) {
                existing.Volume = 0;
                existing.Destroy();
            }
        }

        root.ChildAdded.Connect((child) => {
            if (child.IsA("Sound") && DEFAULT_SOUND_NAMES.includes(child.Name)) {
                child.Volume = 0;
                child.Destroy();
            }
        });
    }
}