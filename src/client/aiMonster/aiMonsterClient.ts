import { Workspace, RunService } from "@rbxts/services";

const FOOTSTEP_SOUND_ID = "rbxassetid://121542193392069";

const ROLL_OFF_MIN_DISTANCE = 10;
const ROLL_OFF_MAX_DISTANCE = 75;

class AISingleRigController {
	private rig: Model;
	private rigRootPart: BasePart;
	private footstepSound: Sound;
	private movingAttrConn: RBXScriptConnection;

	constructor(rig: Model) {
		this.rig = rig;
		this.rigRootPart = rig.WaitForChild("HumanoidRootPart") as BasePart;

		this.footstepSound = new Instance("Sound");
		this.footstepSound.SoundId = FOOTSTEP_SOUND_ID;
		this.footstepSound.Volume = 0.6;
		this.footstepSound.Looped = true;
		this.footstepSound.RollOffMode = Enum.RollOffMode.Linear;
		this.footstepSound.RollOffMinDistance = ROLL_OFF_MIN_DISTANCE;
		this.footstepSound.RollOffMaxDistance = ROLL_OFF_MAX_DISTANCE;
		this.footstepSound.Parent = this.rigRootPart;

		const initialMoving = this.rigRootPart.GetAttribute("_aiMoving") === true;
		if (initialMoving) {
			this.footstepSound.Play();
		}

		this.movingAttrConn = this.rigRootPart.GetAttributeChangedSignal("_aiMoving").Connect(() => {
			const moving = this.rigRootPart.GetAttribute("_aiMoving") === true;
			if (moving && !this.footstepSound.IsPlaying) {
				this.footstepSound.Play();
			} else if (!moving && this.footstepSound.IsPlaying) {
				this.footstepSound.Stop();
			}
		});
	}

	destroy() {
		this.movingAttrConn.Disconnect();
		if (this.footstepSound.IsPlaying) this.footstepSound.Stop();
	}
}

export class AIMonsterClient {
	private controllers = new Map<Model, AISingleRigController>();
	private pollConn?: RBXScriptConnection;

	start() {
		this.scanExisting();

		Workspace.ChildAdded.Connect((child) => {
			this.tryTrackModel(child);
		});

		Workspace.ChildRemoved.Connect((child) => {
			if (child.IsA("Model") && child.GetAttribute("isAIRig") === true) {
				this.untrackModel(child);
			}
		});

		this.pollConn = RunService.Heartbeat.Connect(() => {
			for (const [model, controller] of this.controllers) {
				if (!model.Parent) {
					controller.destroy();
					this.controllers.delete(model);
				}
			}
		});
	}

	private scanExisting() {
		for (const child of Workspace.GetChildren()) {
			this.tryTrackModel(child);
		}
	}

	private tryTrackModel(child: Instance) {
		if (!child.IsA("Model")) return;
		if (child.GetAttribute("isAIRig") !== true) return;
		if (this.controllers.has(child)) return;

		const rigRoot = child.FindFirstChild("HumanoidRootPart");
		if (!rigRoot) return;

		print(`[AIMonsterClient] Tracking AI rig: ${child.Name}`);
		const controller = new AISingleRigController(child);
		this.controllers.set(child, controller);
	}

	private untrackModel(model: Model) {
		const controller = this.controllers.get(model);
		if (controller) {
			controller.destroy();
			this.controllers.delete(model);
		}
	}
}
