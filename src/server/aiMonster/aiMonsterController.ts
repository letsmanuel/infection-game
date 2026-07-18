import { Players, Workspace, ServerStorage, RunService, PathfindingService } from "@rbxts/services";
import { isPowerOutageActive } from "server/gameState";
import { AIDebugConfig } from "shared/configs/aidebug";

const RIG_MODEL_NAME = "playercontrolledRig";
const RIG_Y_OFFSET = 1;
const IDLE_ANIM_ID = "rbxassetid://92701505225015";
const WALK_ANIM_ID = "rbxassetid://117442281858803";

const START_SPEED = 10;
const RAMP_TIME = 10;
const MAX_SPEED = 26;
const STUN_SPEED = 2;
const STUN_DURATION = 4;

const DETECTION_RANGE = 80;
const DETECTION_INTERVAL = 0.3;
const SPOT_DURATION = 10;
const WANDER_STOP_CHANCE = 0.3;
const WANDER_STOP_MIN = 1;
const WANDER_STOP_MAX = 3;
const WAYPOINT_REACHED_DISTANCE = 6;
const STUCK_TIME = 2;
const STUCK_MOVE_THRESHOLD = 1;
const KILL_RANGE = 5;
const KILL_COOLDOWN = 1.5;


let waypoints: Attachment[] = [];
let powerOutageWaypoints: Attachment[] = [];

function refreshWaypoints() {
	const folder = Workspace.FindFirstChild("AiMonsterPoints") as Folder | undefined;
	waypoints = folder ? folder.GetChildren().filter((c): c is Attachment => c.IsA("Attachment")) : [];

	const outageFolder = Workspace.FindFirstChild("AiMonsterPointsPowerOutage") as Folder | undefined;
	powerOutageWaypoints = outageFolder ? outageFolder.GetChildren().filter((c): c is Attachment => c.IsA("Attachment")) : [];
}

function getRandomWaypoint(usePowerOutage: boolean): Attachment | undefined {
	const list = usePowerOutage && powerOutageWaypoints.size() > 0 ? powerOutageWaypoints : waypoints;
	if (list.size() === 0) return undefined;
	return list[math.random(0, list.size() - 1)];
}

function getNearestWaypoint(position: Vector3, usePowerOutage: boolean): Attachment | undefined {
	const list = usePowerOutage && powerOutageWaypoints.size() > 0 ? powerOutageWaypoints : waypoints;
	if (list.size() === 0) return undefined;
	let nearest: Attachment | undefined;
	let nearestDist = math.huge;
	for (const wp of list) {
		const dist = position.sub(wp.WorldPosition).Magnitude;
		if (dist < nearestDist) { nearestDist = dist; nearest = wp; }
	}
	return nearest;
}

function createInvisibleCharacter(): Model {
	const model = new Instance("Model");
	model.Name = "AIChar";

	const rootPart = new Instance("Part");
	rootPart.Name = "HumanoidRootPart";
	rootPart.Size = new Vector3(2, 2, 1);
	rootPart.Transparency = 1;
	rootPart.CanCollide = true;
	rootPart.Anchored = false;
	rootPart.Parent = model;

	const torso = new Instance("Part");
	torso.Name = "UpperTorso";
	torso.Size = new Vector3(2, 2, 1);
	torso.Transparency = 1;
	torso.CanCollide = false;
	torso.Parent = model;

	const head = new Instance("Part");
	head.Name = "Head";
	head.Size = new Vector3(2, 1, 1);
	head.Transparency = 1;
	head.CanCollide = false;
	head.Parent = model;

	const humanoid = new Instance("Humanoid");
	humanoid.HipHeight = 3;
	humanoid.WalkSpeed = START_SPEED;
	humanoid.AutoRotate = true;
	humanoid.BreakJointsOnDeath = true;
	humanoid.PlatformStand = false;
	humanoid.Parent = model;

	return model;
}

type AIState = "WANDER" | "CHASE" | "RETREAT";

class AIMonster {
	character: Model;
	charHumanoid: Humanoid;
	charRootPart: BasePart;

	visualRig: Model;
	rigRootPart: BasePart;
	rigAnimator: Animator;
	idleTrack?: AnimationTrack;
	walkTrack?: AnimationTrack;

	state: AIState = "WANDER";
	currentWaypoint?: Vector3;
	spotPosition?: Vector3;
	spotTimer = 0;

	pathWaypoints: Vector3[] = [];
	currentPathIndex = 0;

	walkStartTime = 0;
	isWalking = false;
	lastHealth: number;
	stunTimer = 0;
	recentlyDamaged = false;

	wanderStopTimer = 0;
	isStopped = false;

	lastDetectionCheck = 0;
	debugLogTimer = 0;

	stuckCheckPos = new Vector3();
	stuckCheckTime = 0;
	lastPosition = new Vector3();
	stopFrames = 0;
	lastKillTime = 0;

	private destroyed = false;
	private updateConn?: RBXScriptConnection;
	private debugFolder?: Folder;
	private debugHighlight?: Highlight;
	private debugBillboard?: BillboardGui;
	private debugVisionRays: Part[] = [];
	private debugTargetMarker?: Part;
	private debugPathParts: Part[] = [];
	debugPathTimer = 0;

	constructor(id: number) {
		this.character = createInvisibleCharacter();
		this.character.Name = `AIChar_${id}`;
		this.character.SetAttribute("role", "Attacker");
		this.character.SetAttribute("isAI", true);
		this.character.SetAttribute("_stunned", false);
		this.character.Parent = Workspace;

		this.charHumanoid = this.character.WaitForChild("Humanoid") as Humanoid;
		this.charRootPart = this.character.WaitForChild("HumanoidRootPart") as BasePart;
		this.lastHealth = this.charHumanoid.Health;

		const rigTemplate = ServerStorage.FindFirstChild(RIG_MODEL_NAME) as Model | undefined;
		assert(rigTemplate, `[AIMonster] Rig template not found`);

		this.visualRig = rigTemplate.Clone();
		this.visualRig.Name = `AIMonster_${id}`;
		this.visualRig.Parent = Workspace;

		this.rigRootPart = this.visualRig.WaitForChild("HumanoidRootPart") as BasePart;
		this.rigRootPart.Anchored = true;
		this.rigRootPart.CanCollide = false;

		for (const child of this.visualRig.GetDescendants()) {
			if (child.IsA("BasePart") && child !== this.rigRootPart) {
				child.CanCollide = false;
				child.Massless = true;
			}
		}

		this.visualRig.SetAttribute("isAIRig", true);

		let animController = this.visualRig.FindFirstChildOfClass("AnimationController");
		if (!animController) {
			animController = new Instance("AnimationController");
			animController.Parent = this.visualRig;
		}
		let animator = animController.FindFirstChildOfClass("Animator");
		if (!animator) {
			animator = new Instance("Animator");
			animator.Parent = animController;
		}
		this.rigAnimator = animator;

		const idleAnim = new Instance("Animation");
		idleAnim.AnimationId = IDLE_ANIM_ID;
		this.idleTrack = this.rigAnimator.LoadAnimation(idleAnim);
		if (this.idleTrack) {
			this.idleTrack.Looped = true;
			this.idleTrack.Priority = Enum.AnimationPriority.Idle;
		}

		const walkAnim = new Instance("Animation");
		walkAnim.AnimationId = WALK_ANIM_ID;
		this.walkTrack = this.rigAnimator.LoadAnimation(walkAnim);
		if (this.walkTrack) {
			this.walkTrack.Looped = true;
			this.walkTrack.Priority = Enum.AnimationPriority.Movement;
		}

		const startWP = getRandomWaypoint(false);
		if (startWP) {
			const cf = new CFrame(startWP.WorldPosition);
			this.charRootPart.CFrame = cf;
			this.rigRootPart.CFrame = cf.add(new Vector3(0, RIG_Y_OFFSET, 0));
			this.currentWaypoint = startWP.WorldPosition;
		}

		this.setupDebugVisuals();
	}

	start() {
		if (this.idleTrack) {
			this.idleTrack.Play();
		}

		this.lastPosition = this.charRootPart.Position;

		if (this.currentWaypoint) {
			this.charHumanoid.MoveTo(this.currentWaypoint);
			this.computePathTo(this.currentWaypoint);
		}

		this.updateConn = RunService.Heartbeat.Connect((dt) => {
			if (this.destroyed) return;
			this.update(dt);
		});
	}

	private update(dt: number) {
		const isDead = this.charHumanoid.Health <= 0;
		if (isDead) { this.cleanup(); return; }

		this.syncRigPosition();
		this.updateDebugVisuals();
		this.lastDetectionCheck += dt;
		this.debugLogTimer += dt;

		if (this.character.GetAttribute("_stunned") === true) {
			this.stunTimer = math.max(0, this.stunTimer - dt);
			this.charHumanoid.WalkSpeed = STUN_SPEED;
			if (this.stunTimer <= 0) { this.character.SetAttribute("_stunned", false); }
			this.setAnimState(false);
			return;
		}

		const tookDamage = this.charHumanoid.Health < this.lastHealth;
		this.lastHealth = this.charHumanoid.Health;
		if (tookDamage) {
			this.recentlyDamaged = true;
			if (this.state !== "RETREAT") {
				this.state = "RETREAT";
				this.spotTimer = 0;
				this.pathWaypoints = [];
			}
		}

		switch (this.state) {
			case "WANDER": this.updateWander(dt); break;
			case "CHASE": this.updateChase(dt); break;
			case "RETREAT": this.updateRetreat(dt); break;
		}

		this.checkKillNearbyPlayers();

		const currentPos = this.charRootPart.Position;
		const posDelta = currentPos.sub(this.lastPosition).Magnitude;
		if (posDelta > 0.01) {
			this.stopFrames = 0;
		} else {
			this.stopFrames = math.min(this.stopFrames + 1, 10);
		}
		const moving = this.stopFrames < 5;
		this.lastPosition = currentPos;
		this.setAnimState(moving);
		this.rampSpeed(dt, moving);
		this.rigRootPart.SetAttribute("_aiMoving", this.isWalking);
		this.rigRootPart.SetAttribute("_aiWalkSpeed", this.charHumanoid.WalkSpeed);
		this.checkStuck();

		if (this.debugLogTimer >= 3) {
			this.debugLogTimer = 0;
			const pos = this.charRootPart.Position;
			print(`[AIMonster] state=${this.state} pos=${"%.1f".format(pos.X)},${"%.1f".format(pos.Y)},${"%.1f".format(pos.Z)} moving=${moving} delta=${"%.2f".format(posDelta)} speed=${"%.1f".format(this.charHumanoid.WalkSpeed)} wpt=${this.currentWaypoint ? `${"%.1f".format(this.currentWaypoint.X)},${"%.1f".format(this.currentWaypoint.Z)}` : "none"} pathIdx=${this.currentPathIndex}/${this.pathWaypoints.size()}`);
		}
	}

	private syncRigPosition() {
		const charCFrame = this.charRootPart.CFrame;
		this.rigRootPart.CFrame = charCFrame.add(new Vector3(0, RIG_Y_OFFSET, 0));
	}

	private computePathTo(target: Vector3) {
		this.pathWaypoints = [];
		task.spawn(() => {
			const path = PathfindingService.CreatePath({
				AgentRadius: 2,
				AgentHeight: 5,
				AgentCanJump: true,
			});
			path.ComputeAsync(this.charRootPart.Position, target);

			const wps = path.GetWaypoints();
			this.pathWaypoints = [];
			for (let i = 0; i < wps.size(); i++) {
				this.pathWaypoints.push(wps[i].Position);
			}
			this.currentPathIndex = 0;
			if (this.pathWaypoints.size() > 0) {
				this.charHumanoid.MoveTo(this.pathWaypoints[0]);
			} else {
				this.charHumanoid.MoveTo(target);
			}
			print(`[AIMonster] Path computed: ${this.pathWaypoints.size()} waypoints`);
		});
	}

	private followPath() {
		if (this.pathWaypoints.size() === 0) return;
		if (this.currentPathIndex >= this.pathWaypoints.size()) {
			this.pathWaypoints = [];
			return;
		}

		const target = this.pathWaypoints[this.currentPathIndex];
		const dist = this.charRootPart.Position.sub(target).Magnitude;

		if (dist < WAYPOINT_REACHED_DISTANCE) {
			this.currentPathIndex++;
			if (this.currentPathIndex < this.pathWaypoints.size()) {
				this.charHumanoid.MoveTo(this.pathWaypoints[this.currentPathIndex]);
			}
		}
	}

	private findPlayerBehind(): Player | undefined {
		const head = this.character.FindFirstChild("Head") as BasePart | undefined;
		const origin = head ? head.Position : this.charRootPart.Position.add(new Vector3(0, 2.5, 0));
		const forward = this.charRootPart.CFrame.LookVector;
		const right = this.charRootPart.CFrame.RightVector;

		const angles = [135, 150, 180, 210, 225];
		for (const deg of angles) {
			const rad = math.rad(deg);
			const dir = forward.mul(math.cos(rad)).add(right.mul(math.sin(rad)));
			const target = origin.add(dir.mul(20));

			const params = new RaycastParams();
			params.FilterType = Enum.RaycastFilterType.Exclude;
			params.FilterDescendantsInstances = [this.character, this.visualRig];

			const result = Workspace.Raycast(origin, target.sub(origin), params);
			if (result) {
				for (const player of Players.GetPlayers()) {
					const char = player.Character;
					if (char && result.Instance.IsDescendantOf(char)) {
						const role = player.GetAttribute("role") as string | undefined;
						if (role === "Runner" && player.GetAttribute("_dead") !== true) {
							return player;
						}
					}
				}
			}
		}

		return undefined;
	}

	private checkStuck() {
		const now = os.clock();
		if (now - this.stuckCheckTime < 1) return;

		const moved = this.charRootPart.Position.sub(this.stuckCheckPos).Magnitude;
		const elapsed = now - this.stuckCheckTime;

		if (moved < STUCK_MOVE_THRESHOLD && elapsed > STUCK_TIME && this.stuckCheckPos.Magnitude > 0) {
			print("[AIMonster] STUCK — checking behind for player...");

			const behindPlayer = this.findPlayerBehind();
			if (behindPlayer) {
				const char = behindPlayer.Character;
				if (char) {
					const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
					if (root) {
						print(`[AIMonster] STUCK — found ${behindPlayer.Name} behind, turning around!`);
						this.state = "CHASE";
						this.spotPosition = root.Position;
						this.spotTimer = SPOT_DURATION;
						this.computePathTo(root.Position);
						this.stuckCheckPos = this.charRootPart.Position;
						this.stuckCheckTime = now;
						return;
					}
				}
			}

			print("[AIMonster] STUCK — recalculating");
			this.pathWaypoints = [];

			let target: Vector3 | undefined;
			if (this.state === "WANDER") {
				target = this.currentWaypoint;
				if (target) {
					this.charHumanoid.MoveTo(target);
					this.computePathTo(target);
				} else {
					this.pickNewWaypoint();
				}
			} else if (this.state === "CHASE" && this.spotPosition) {
				target = this.spotPosition;
				this.charHumanoid.MoveTo(target);
				this.computePathTo(target);
			} else if (this.state === "RETREAT") {
				const wp = getNearestWaypoint(this.charRootPart.Position, isPowerOutageActive());
				if (wp) {
					this.charHumanoid.MoveTo(wp.WorldPosition);
					this.computePathTo(wp.WorldPosition);
				}
			}
		}

		this.stuckCheckPos = this.charRootPart.Position;
		this.stuckCheckTime = now;
	}

	private checkKillNearbyPlayers() {
		const now = os.clock();
		if (now - this.lastKillTime < KILL_COOLDOWN) return;

		const rootPos = this.charRootPart.Position;
		for (const player of Players.GetPlayers()) {
			const role = player.GetAttribute("role") as string | undefined;
			if (role !== "Runner") continue;
			if (player.GetAttribute("_dead") === true) continue;

			const char = player.Character;
			if (!char) continue;
			const playerRoot = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
			if (!playerRoot) continue;

			const dist = playerRoot.Position.sub(rootPos).Magnitude;
			if (dist < KILL_RANGE) {
				const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
				if (humanoid && humanoid.Health > 0) {
					humanoid.Health = 0;
					this.lastKillTime = now;
					print(`[AIMonster] Killed ${player.Name} (dist=${"%.1f".format(dist)})`);
				}
			}
		}
	}

	private updateWander(dt: number) {
		if (this.isStopped) {
			this.wanderStopTimer -= dt;
			if (this.wanderStopTimer <= 0) {
				this.isStopped = false;
				this.pickNewWaypoint();
			}
			return;
		}

		this.followPath();

		if (this.pathWaypoints.size() === 0 && this.currentWaypoint) {
			const dist = this.charRootPart.Position.sub(this.currentWaypoint).Magnitude;
			if (dist > WAYPOINT_REACHED_DISTANCE) {
				this.charHumanoid.MoveTo(this.currentWaypoint);
			} else {
				if (math.random() < WANDER_STOP_CHANCE) {
					this.isStopped = true;
					this.wanderStopTimer = WANDER_STOP_MIN + math.random() * (WANDER_STOP_MAX - WANDER_STOP_MIN);
				} else {
					this.pickNewWaypoint();
				}
			}
		}

		if (this.lastDetectionCheck >= DETECTION_INTERVAL) {
			this.lastDetectionCheck = 0;
			const player = this.findVisiblePlayer();
			if (player) {
				const char = player.Character;
				if (char) {
					const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
					if (root) {
						this.state = "CHASE";
						this.spotPosition = root.Position;
						this.spotTimer = SPOT_DURATION;
						this.computePathTo(root.Position);
					}
				}
			}
		}
	}

	private updateChase(dt: number) {
		this.spotTimer = math.max(0, this.spotTimer - dt);

		if (this.lastDetectionCheck >= DETECTION_INTERVAL) {
			this.lastDetectionCheck = 0;
			const player = this.findPlayerNearby();
			if (player) {
				const char = player.Character;
				if (char) {
					const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
					if (root) {
						this.spotPosition = root.Position;
						this.spotTimer = SPOT_DURATION;
						this.computePathTo(root.Position);
						return;
					}
				}
			}
		}

		if (this.spotTimer <= 0) {
			this.state = "RETREAT";
			this.spotPosition = undefined;
			this.pathWaypoints = [];
			return;
		}

		this.followPath();
	}

	private updateRetreat(dt: number) {
		const useOutagePoints = isPowerOutageActive();
		const nearest = getNearestWaypoint(this.charRootPart.Position, useOutagePoints);

		if (nearest) {
			this.followPath();

			const dist = this.charRootPart.Position.sub(nearest.WorldPosition).Magnitude;
			if (dist < WAYPOINT_REACHED_DISTANCE && this.pathWaypoints.size() === 0) {
				if (!useOutagePoints && !this.recentlyDamaged) {
					this.state = "WANDER";
					this.recentlyDamaged = false;
					this.pickNewWaypoint();
					return;
				}
				this.recentlyDamaged = false;
			} else if (this.pathWaypoints.size() === 0) {
				this.computePathTo(nearest.WorldPosition);
			}
		} else {
			this.state = "WANDER";
		}

		if (this.lastDetectionCheck >= DETECTION_INTERVAL) {
			this.lastDetectionCheck = 0;
			const player = this.findPlayerNearby();
			if (player && !this.recentlyDamaged) {
				const char = player.Character;
				if (char) {
					const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
					if (root) {
						this.state = "CHASE";
						this.spotPosition = root.Position;
						this.spotTimer = SPOT_DURATION;
						this.computePathTo(root.Position);
						return;
					}
				}
			}
		}
	}

	private findVisiblePlayer(): Player | undefined {
		for (const player of Players.GetPlayers()) {
			const role = player.GetAttribute("role") as string | undefined;
			if (role !== "Runner") continue;
			if (player.GetAttribute("_dead") === true) continue;
			if (this.canSeePlayer(player)) return player;
		}
		return undefined;
	}

	private findPlayerNearby(): Player | undefined {
		for (const player of Players.GetPlayers()) {
			const role = player.GetAttribute("role") as string | undefined;
			if (role !== "Runner") continue;
			if (player.GetAttribute("_dead") === true) continue;

			const char = player.Character;
			if (!char) continue;
			const root = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
			if (!root) continue;

			const dist = root.Position.sub(this.charRootPart.Position).Magnitude;
			if (dist > DETECTION_RANGE * 0.6) continue;

			if (this.raycastToward(this.charRootPart.Position.add(new Vector3(0, 2.5, 0)), root.Position, char)) return player;
		}
		return undefined;
	}

	private canSeePlayer(player: Player): boolean {
		const char = player.Character;
		if (!char) return false;

		const targetRoot = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (!targetRoot) return false;

		const head = this.character.FindFirstChild("Head") as BasePart | undefined;
		const origin = head ? head.Position : this.charRootPart.Position.add(new Vector3(0, 2.5, 0));

		const dist = targetRoot.Position.sub(origin).Magnitude;
		if (dist > DETECTION_RANGE) return false;

		const targetHead = char.FindFirstChild("Head") as BasePart | undefined;
		const targets = [targetRoot.Position];
		if (targetHead) targets.push(targetHead.Position);

		for (const targetPos of targets) {
			const result = this.raycastToward(origin, targetPos, char);
			if (result) return true;
		}

		return false;
	}

	private raycastToward(origin: Vector3, target: Vector3, char: Model, depth = 0): boolean {
		if (depth > 2) return false;

		const dir = target.sub(origin);
		if (dir.Magnitude < 0.5) return true;

		const params = new RaycastParams();
		params.FilterType = Enum.RaycastFilterType.Exclude;
		params.FilterDescendantsInstances = [this.character, this.visualRig];

		const result = Workspace.Raycast(origin, dir, params);
		if (!result) return true;
		if (result.Instance.IsDescendantOf(char)) return true;

		if (result.Instance.IsA("BasePart") && result.Instance.Transparency > 0.5) {
			const nextOrigin = result.Position.add(dir.Unit.mul(0.2));
			return this.raycastToward(nextOrigin, target, char, depth + 1);
		}

		return false;
	}

	private pickNewWaypoint() {
		const useOutagePoints = isPowerOutageActive();
		const wp = getRandomWaypoint(useOutagePoints);
		if (wp) {
			this.currentWaypoint = wp.WorldPosition;
			this.computePathTo(wp.WorldPosition);
		}
	}

	private setAnimState(moving: boolean) {
		if (moving && !this.isWalking) {
			this.isWalking = true;
			this.walkStartTime = os.clock();
			if (this.idleTrack && this.idleTrack.IsPlaying) this.idleTrack.Stop(0.15);
			if (this.walkTrack && !this.walkTrack.IsPlaying) this.walkTrack.Play(0.15);
		} else if (!moving && this.isWalking) {
			this.isWalking = false;
			if (this.walkTrack && this.walkTrack.IsPlaying) this.walkTrack.Stop(0.15);
			if (this.idleTrack && !this.idleTrack.IsPlaying) this.idleTrack.Play(0.15);
		}
	}

	private rampSpeed(dt: number, moving: boolean) {
		if (!moving) { this.charHumanoid.WalkSpeed = START_SPEED; return; }
		const elapsed = os.clock() - this.walkStartTime;
		if (elapsed >= RAMP_TIME) { this.charHumanoid.WalkSpeed = MAX_SPEED; return; }
		this.charHumanoid.WalkSpeed = START_SPEED + (MAX_SPEED - START_SPEED) * (elapsed / RAMP_TIME);
	}

	private setupDebugVisuals() {
		if (!AIDebugConfig.enabled) return;
		let rootFolder = Workspace.FindFirstChild("AIDebug") as Folder | undefined;
		if (!rootFolder) { rootFolder = new Instance("Folder"); rootFolder.Name = "AIDebug"; rootFolder.Parent = Workspace; }
		this.debugFolder = new Instance("Folder");
		this.debugFolder.Name = this.visualRig.Name;
		this.debugFolder.Parent = rootFolder;

		// Show invisible character slightly visible
		for (const child of this.character.GetDescendants()) {
			if (child.IsA("BasePart") && child !== this.charRootPart) {
				child.Transparency = 0.7;
			}
		}

		if (AIDebugConfig.showHighlight) {
			this.debugHighlight = new Instance("Highlight");
			this.debugHighlight.OutlineColor = new Color3(1, 0.5, 0);
			this.debugHighlight.FillTransparency = 0.6;
			this.debugHighlight.Parent = this.visualRig;
		}

		if (AIDebugConfig.showStatus) {
			const head = this.visualRig.FindFirstChild("Head", true) as BasePart | undefined;
			if (head) {
				this.debugBillboard = new Instance("BillboardGui");
				this.debugBillboard.AlwaysOnTop = true;
				this.debugBillboard.Size = new UDim2(0, 220, 0, 50);
				this.debugBillboard.StudsOffset = new Vector3(0, 3, 0);
				this.debugBillboard.MaxDistance = 200;
				const bg = new Instance("Frame");
				bg.Size = new UDim2(1, 0, 1, 0);
				bg.BackgroundColor3 = new Color3(0, 0, 0);
				bg.BackgroundTransparency = 0.3;
				bg.Parent = this.debugBillboard;
				const label = new Instance("TextLabel");
				label.Name = "StatusText";
				label.Size = new UDim2(1, 0, 1, 0);
				label.BackgroundTransparency = 1;
				label.TextColor3 = new Color3(1, 1, 1);
				label.TextScaled = true;
				label.Parent = bg;
				this.debugBillboard.Parent = head;
			}
		}

		if (AIDebugConfig.showVisionRay) {
			// Create 3 vision rays (cone spread)
			for (let i = 0; i < 3; i++) {
				const ray = new Instance("Part");
				ray.Anchored = true;
				ray.CanCollide = false;
				ray.Color = new Color3(1, 0.2, 0.2);
				ray.Material = Enum.Material.Neon;
				ray.Size = new Vector3(0.1, 0.1, 1);
				ray.Transparency = 0.4;
				ray.Parent = this.debugFolder;
				this.debugVisionRays.push(ray);
			}
		}

		if (AIDebugConfig.showTargetWaypoint) {
			this.debugTargetMarker = new Instance("Part");
			this.debugTargetMarker.Shape = Enum.PartType.Ball;
			this.debugTargetMarker.Anchored = true;
			this.debugTargetMarker.CanCollide = false;
			this.debugTargetMarker.Color = new Color3(0, 1, 0);
			this.debugTargetMarker.Material = Enum.Material.Neon;
			this.debugTargetMarker.Size = new Vector3(2, 2, 2);
			this.debugTargetMarker.Transparency = 0.2;
			this.debugTargetMarker.Parent = this.debugFolder;
		}
	}

	private updateDebugVisuals() {
		if (!AIDebugConfig.enabled || !this.debugFolder) return;

		// State-colored highlight
		if (this.debugHighlight) {
			if (this.state === "CHASE") {
				this.debugHighlight.FillColor = new Color3(1, 0.1, 0.1);
				this.debugHighlight.OutlineColor = new Color3(1, 0.3, 0.3);
			} else if (this.state === "RETREAT") {
				this.debugHighlight.FillColor = new Color3(0.1, 0.3, 1);
				this.debugHighlight.OutlineColor = new Color3(0.3, 0.5, 1);
			} else {
				this.debugHighlight.FillColor = new Color3(1, 0.6, 0);
				this.debugHighlight.OutlineColor = new Color3(1, 0.8, 0);
			}
		}

		// Billboard
		if (this.debugBillboard) {
			const label = this.debugBillboard.FindFirstChild("Frame")?.FindFirstChild("StatusText") as TextLabel | undefined;
			if (label) {
				label.Text = `${this.state}\nHP:${"%.0f".format(this.charHumanoid.Health)}\nPath:${this.currentPathIndex}/${this.pathWaypoints.size()}\nSpeed:${"%.1f".format(this.charHumanoid.WalkSpeed)}${this.spotTimer > 0 ? `\nTrack:${"%.1f".format(this.spotTimer)}s` : ""}${this.isStopped ? "\nPAUSED" : ""}`;
			}
		}

		// Vision rays (cone)
		if (AIDebugConfig.showVisionRay) {
			const head = this.character.FindFirstChild("Head") as BasePart | undefined;
			const origin = head ? head.Position : this.charRootPart.Position.add(new Vector3(0, 2.5, 0));
			const forward = this.charRootPart.CFrame.LookVector;
			const right = this.charRootPart.CFrame.RightVector;

			for (let i = 0; i < this.debugVisionRays.size() && i < 3; i++) {
				const spread = (i - 1) * 4;
				const target = origin.add(forward.mul(DETECTION_RANGE)).add(right.mul(spread));
				const dir = target.sub(origin);
				const dist = dir.Magnitude;
				const mid = origin.add(dir.mul(0.5));

				this.debugVisionRays[i].CFrame = CFrame.lookAt(mid, target);
				this.debugVisionRays[i].Size = new Vector3(0.1, 0.1, dist > 0 ? dist : 1);
				this.debugVisionRays[i].Transparency = this.state === "CHASE" ? 0.1 : 0.5;
				this.debugVisionRays[i].Color = this.state === "CHASE" ? new Color3(1, 0.1, 0) : new Color3(1, 0.5, 0.3);
			}
		}

		// Target marker
		if (AIDebugConfig.showTargetWaypoint && this.debugTargetMarker) {
			const target = this.currentWaypoint ?? (this.pathWaypoints.size() > 0 ? this.pathWaypoints[this.pathWaypoints.size() - 1] : this.spotPosition);
			if (target) {
				this.debugTargetMarker.Position = target;
				this.debugTargetMarker.Transparency = 0.2;
				// Pulse
				const pulse = 1 + math.sin(os.clock() * 3) * 0.5;
				this.debugTargetMarker.Size = new Vector3(2 * pulse, 2 * pulse, 2 * pulse);
			} else {
				this.debugTargetMarker.Transparency = 1;
			}
		}

		// Path dots
		if (AIDebugConfig.showPath && this.pathWaypoints.size() > 0) {
			this.debugPathTimer += 0.016;
			if (this.debugPathTimer >= 0.3) {
				this.debugPathTimer = 0;
				for (const p of this.debugPathParts) p.Destroy();
				this.debugPathParts = [];
				for (let i = 0; i < this.pathWaypoints.size(); i++) {
					const dot = new Instance("Part");
					dot.Shape = Enum.PartType.Ball;
					dot.Anchored = true;
					dot.CanCollide = false;
					dot.Size = i === this.currentPathIndex ? new Vector3(0.8, 0.8, 0.8) : new Vector3(0.4, 0.4, 0.4);
					dot.Material = Enum.Material.Neon;
					dot.Position = this.pathWaypoints[i];
					dot.Color = i === this.currentPathIndex ? new Color3(1, 1, 1) : new Color3(0.3, 0.8, 1);
					dot.Parent = this.debugFolder;
					this.debugPathParts.push(dot);
				}
			}
		}
	}

	private destroyDebugVisuals() {
		if (this.debugHighlight) { this.debugHighlight.Destroy(); this.debugHighlight = undefined; }
		if (this.debugBillboard) { this.debugBillboard.Destroy(); this.debugBillboard = undefined; }
		for (const r of this.debugVisionRays) r.Destroy();
		this.debugVisionRays = [];
		if (this.debugTargetMarker) { this.debugTargetMarker.Destroy(); this.debugTargetMarker = undefined; }
		for (const p of this.debugPathParts) p.Destroy();
		this.debugPathParts = [];
		if (this.debugFolder) { this.debugFolder.Destroy(); this.debugFolder = undefined; }
	}

	private cleanup() {
		this.destroyed = true;
		this.updateConn?.Disconnect();
		this.destroyDebugVisuals();
		task.wait(5);
		this.character.Destroy();
		this.visualRig.Destroy();
	}

	despawn() {
		this.destroyed = true;
		this.updateConn?.Disconnect();
		this.destroyDebugVisuals();
		this.character.Destroy();
		this.visualRig.Destroy();
	}
}

let instance: AIMonsterController;

export function getAIMonsterController(): AIMonsterController {
	return instance;
}

export class AIMonsterController {
	private monsters: AIMonster[] = [];
	private running = false;

	start() {
		if (this.running) return;
		this.running = true;
		instance = this;
	}

	spawn(count: number) {
		refreshWaypoints();
		if (waypoints.size() === 0) warn("[AIMonster] No waypoints found in AiMonsterPoints");
		for (let i = 0; i < count; i++) {
			const id = this.monsters.size() + 1;
			const monster = new AIMonster(id);
			this.monsters.push(monster);
			monster.start();
			print(`[AIMonster] Spawned #${id}`);
		}
		print(`[AIMonster] Total: ${this.monsters.size()}`);
	}

	despawnAll() {
		for (const m of this.monsters) m.despawn();
		this.monsters = [];
		print("[AIMonster] All despawned");
	}
}
