import { SoundService, Players } from "@rbxts/services";

const HIGH_GAIN = -40;
const MID_GAIN = -15;
const LOW_GAIN = 5;

export class AttackerSoundMuffler {
	private muffler?: EqualizerSoundEffect;

	start() {
		const role = Players.LocalPlayer.GetAttribute("role") as string | undefined;
		if (role === "Attacker") {
			this.enableMuffle();
		}

		Players.LocalPlayer.GetAttributeChangedSignal("role").Connect(() => {
			const changedRole = Players.LocalPlayer.GetAttribute("role") as string | undefined;
			if (changedRole === "Attacker") {
				this.enableMuffle();
			} else {
				this.disableMuffle();
			}
		});
	}

	private enableMuffle() {
		if (this.muffler) return;

		this.muffler = new Instance("EqualizerSoundEffect");
		this.muffler.Name = "AttackerMuffler";
		this.muffler.HighGain = HIGH_GAIN;
		this.muffler.MidGain = MID_GAIN;
		this.muffler.LowGain = LOW_GAIN;
		this.muffler.Parent = SoundService;
	}

	private disableMuffle() {
		if (this.muffler) {
			this.muffler.Destroy();
			this.muffler = undefined;
		}
	}
}
