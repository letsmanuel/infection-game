import { SoundService } from "@rbxts/services";

const TARGET_VOLUME = 0.25;

const FADE_IN_TIME = 5;
const FADE_OUT_TIME = 5;

const MAX_PLAY_TIME = 100;
const MIN_PLAY_TIME_BEFORE_EARLY_FADE = 30;
const EARLY_FADE_CHANCE = 0.9;

const MIN_WAIT_BETWEEN_TRACKS = 60;
const MAX_WAIT_BETWEEN_TRACKS = 180;

export class AmbientMusicModule {
    private running = false;
    private currentSound?: Sound;
    private loopThread?: thread;

    start() {
        if (this.running) return;
        this.running = true;

        this.loopThread = task.spawn(() => {
            while (this.running) {
                this.playRandomTrack();

                if (!this.running) break;

                const waitTime = MIN_WAIT_BETWEEN_TRACKS
                    + math.random() * (MAX_WAIT_BETWEEN_TRACKS - MIN_WAIT_BETWEEN_TRACKS);
                task.wait(waitTime);
            }
        });
    }

    private playRandomTrack() {
        const parentFolder = SoundService.FindFirstChild("master") as SoundGroup;
        if (!parentFolder){
            warn("Sound aint here btw");
            return
        }
        const folder = parentFolder.FindFirstChild("AmbientMusic");
        if (!folder) return;

        const sounds = folder.GetChildren().filter((c) => c.IsA("Sound")) as Sound[];
        if (sounds.size() === 0) return;

        const sound = sounds[math.random(0, sounds.size() - 1)];
        this.currentSound = sound;

        sound.Volume = 0;
        sound.Play();

        this.fade(sound, 0, TARGET_VOLUME, FADE_IN_TIME);
        if (!this.running || this.currentSound !== sound) return;

        let playDuration = MAX_PLAY_TIME;

        if (math.random() < EARLY_FADE_CHANCE) {
            playDuration = MIN_PLAY_TIME_BEFORE_EARLY_FADE
                + math.random() * (MAX_PLAY_TIME - MIN_PLAY_TIME_BEFORE_EARLY_FADE - FADE_OUT_TIME);
        }

        const remainingPlayTime = math.max(playDuration - FADE_IN_TIME - FADE_OUT_TIME, 0);

        const holdStart = os.clock();
        while (this.running && this.currentSound === sound && (os.clock() - holdStart) < remainingPlayTime) {
            if (!sound.IsPlaying) break;
            task.wait(0.1);
        }

        if (!this.running || this.currentSound !== sound) return;

        this.fade(sound, sound.Volume, 0, FADE_OUT_TIME);

        if (this.currentSound === sound) {
            sound.Stop();
            this.currentSound = undefined;
        }
    }

    private fade(sound: Sound, fromVolume: number, toVolume: number, duration: number) {
        const steps = math.max(math.floor(duration / 0.05), 1);
        const stepTime = duration / steps;

        for (let i = 1; i <= steps; i++) {
            if (!this.running || this.currentSound !== sound) return;

            const alpha = i / steps;
            sound.Volume = fromVolume + (toVolume - fromVolume) * alpha;
            task.wait(stepTime);
        }

        if (this.running && this.currentSound === sound) {
            sound.Volume = toVolume;
        }
    }

    stop() {
        this.running = false;

        if (this.currentSound) {
            this.currentSound.Stop();
            this.currentSound.Volume = 0;
            this.currentSound = undefined;
        }

        if (this.loopThread) {
            task.cancel(this.loopThread);
            this.loopThread = undefined;
        }
    }
}