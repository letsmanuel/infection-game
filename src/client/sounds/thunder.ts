import { SoundService } from "@rbxts/services";

const MIN_INTERVAL = 15;
const MAX_INTERVAL = 20;
const FADE_IN_TIME = 0.3;
const FADE_OUT_TIME = 0.6;
const FADE_STEP = 0.05;

const thunderGroup = SoundService.WaitForChild("master").WaitForChild("Thunder") as SoundGroup;

export class ThunderModule {
	private running = false;
	private loopThread?: thread;

	start() {
		if (this.running) return;
		this.running = true;

		this.loopThread = task.spawn(() => {
			while (this.running) {
				const delay = MIN_INTERVAL + math.random() * (MAX_INTERVAL - MIN_INTERVAL);
				task.wait(delay);
				if (!this.running) break;

				this.playRandomThunder();
			}
		});
	}

	private playRandomThunder() {
		const sounds = thunderGroup.GetChildren().filter((c): c is Sound => c.IsA("Sound"));
		if (sounds.size() === 0) return;

		const sound = sounds[math.random(0, sounds.size() - 1)];
		const defaultVolume = sound.Volume;

		sound.Volume = 0;
		sound.Play();

		const fadeInSteps = math.max(math.floor(FADE_IN_TIME / FADE_STEP), 1);
		const fadeInStepTime = FADE_IN_TIME / fadeInSteps;
		for (let i = 1; i <= fadeInSteps; i++) {
			sound.Volume = defaultVolume * (i / fadeInSteps);
			task.wait(fadeInStepTime);
		}
		sound.Volume = defaultVolume;

		task.wait(math.max(0, sound.TimeLength - FADE_IN_TIME - FADE_OUT_TIME - 0.2));

		const fadeOutSteps = math.max(math.floor(FADE_OUT_TIME / FADE_STEP), 1);
		const fadeOutStepTime = FADE_OUT_TIME / fadeOutSteps;
		for (let i = 1; i <= fadeOutSteps; i++) {
			sound.Volume = defaultVolume * (1 - (i / fadeOutSteps));
			task.wait(fadeOutStepTime);
		}

		sound.Stop();
		sound.Volume = 0;
	}

	stop() {
		this.running = false;
		if (this.loopThread) {
			task.cancel(this.loopThread);
			this.loopThread = undefined;
		}
	}
}
