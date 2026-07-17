import { Players, Workspace, ServerStorage, RunService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";

const RIG_MODEL_NAME = "playercontrolledRig";
const RIG_Y_OFFSET = 1;
const IDLE_ANIM_ID = "rbxassetid://92701505225015";
const WALK_ANIM_ID = "rbxassetid://117442281858803";
const CROUCH_WALK_ANIM_ID = "rbxassetid://72551560851109";
const CROUCH_IDLE_ANIM_ID = "rbxassetid://77138312593417";
const DEATH_ANIM_ID = "rbxassetid://82864045241466";
const SPRINT_ANIM_SPEED = 1.5;
const DEATH_SINK_SPEED = 2;
const DEATH_SINK_Y = -20;

const AnimStateRemote = Remotes.Server.Get(RemoteId.attackerAnimState);

function makeCharacterInvisible(character: Model) {
	for (const child of character.GetDescendants()) {
		if (child.IsA("BasePart")) {
			child.Transparency = 1;
		}
	}
}

function setupAnimController(rig: Model) {
	let animController = rig.FindFirstChildOfClass("AnimationController");
	if (!animController) {
		animController = new Instance("AnimationController");
		animController.Parent = rig;
	}

	let animator = animController.FindFirstChildOfClass("Animator");
	if (!animator) {
		animator = new Instance("Animator");
		animator.Parent = animController;
	}

	return animator;
}

function spawnRigForPlayer(player: Player) {
	const existingRig = findPlayerRig(player);
	if (existingRig) existingRig.Destroy();

	const character = player.Character;
	if (!character) return;

	const rigTemplate = ServerStorage.FindFirstChild(RIG_MODEL_NAME) as Model | undefined;
	if (!rigTemplate) {
		warn(`[AttackerRig] template "${RIG_MODEL_NAME}" not found`);
		return;
	}

	const charRoot = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!charRoot) return;

	makeCharacterInvisible(character);

	const rig = rigTemplate.Clone();
	rig.Name = `${player.Name}_Rig`;
	rig.SetAttribute("controlledBy", player.UserId);
	rig.Parent = Workspace;

	const rigRoot = rig.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (rigRoot) {
		rigRoot.CFrame = charRoot.CFrame.add(new Vector3(0, RIG_Y_OFFSET, 0));
		rigRoot.Anchored = true;
		rigRoot.CanCollide = false;
	}

	for (const child of rig.GetDescendants()) {
		if (child.IsA("BasePart") && child !== rigRoot) {
			child.CanCollide = false;
			child.Massless = true;
		}
	}

	const animator = setupAnimController(rig);

	const idleAnim = new Instance("Animation");
	idleAnim.AnimationId = IDLE_ANIM_ID;
	const idleTrack = animator.LoadAnimation(idleAnim);
	if (idleTrack) {
		idleTrack.Looped = true;
		idleTrack.Priority = Enum.AnimationPriority.Idle;
		idleTrack.Play();
	}

	const walkAnim = new Instance("Animation");
	walkAnim.AnimationId = WALK_ANIM_ID;
	const walkTrack = animator.LoadAnimation(walkAnim);
	if (walkTrack) {
		walkTrack.Looped = true;
		walkTrack.Priority = Enum.AnimationPriority.Movement;
	}

	const crouchWalkAnim = new Instance("Animation");
	crouchWalkAnim.AnimationId = CROUCH_WALK_ANIM_ID;
	const crouchWalkTrack = animator.LoadAnimation(crouchWalkAnim);
	if (crouchWalkTrack) {
		crouchWalkTrack.Looped = true;
		crouchWalkTrack.Priority = Enum.AnimationPriority.Movement;
	}

	const crouchIdleAnim = new Instance("Animation");
	crouchIdleAnim.AnimationId = CROUCH_IDLE_ANIM_ID;
	const crouchIdleTrack = animator.LoadAnimation(crouchIdleAnim);
	if (crouchIdleTrack) {
		crouchIdleTrack.Looped = true;
		crouchIdleTrack.Priority = Enum.AnimationPriority.Idle;
	}

	let dead = false;
	let deathTrack: AnimationTrack | undefined;

	const humanoid = character.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
	if (humanoid) {
		humanoid.BreakJointsOnDeath = false;

		humanoid.Died.Connect(() => {
			if (dead) return;
			dead = true;
			player.SetAttribute("_dead", true);

			if (idleTrack) idleTrack.Stop();
			if (walkTrack) walkTrack.Stop();
			if (crouchWalkTrack) crouchWalkTrack.Stop();
			if (crouchIdleTrack) crouchIdleTrack.Stop();
			remoteConn.Disconnect();

			const deathAnim = new Instance("Animation");
			deathAnim.AnimationId = DEATH_ANIM_ID;
			deathTrack = animator.LoadAnimation(deathAnim);
			if (deathTrack) {
				deathTrack.Priority = Enum.AnimationPriority.Action;
				deathTrack.Play();
			}
		});
	}

	const syncConn = RunService.Heartbeat.Connect(() => {
		if (!rig.Parent || !character.Parent) {
			syncConn.Disconnect();
			return;
		}
		const cr = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (cr && rigRoot && rigRoot.Parent) {
			if (dead) {
				const currentY = rigRoot.CFrame.Y;
				const targetY = math.max(DEATH_SINK_Y, currentY - DEATH_SINK_SPEED * (1 / 60));
				rigRoot.CFrame = new CFrame(rigRoot.CFrame.X, targetY, rigRoot.CFrame.Z);
			} else {
				rigRoot.CFrame = cr.CFrame.add(new Vector3(0, RIG_Y_OFFSET, 0));
			}
		}
	});

	const remoteConn = AnimStateRemote.Connect((sender, isMoving, isSprinting, isCrouching) => {
		if (sender !== player || dead) return;
		if (!rig.Parent || !character.Parent) return;
		if (!idleTrack || !walkTrack) return;

		if (isCrouching) {
			if (crouchWalkTrack && crouchIdleTrack) {
				if (isMoving) {
					if (!crouchWalkTrack.IsPlaying) {
						idleTrack.Stop(0.15);
						walkTrack.Stop(0.15);
						crouchIdleTrack.Stop(0.15);
						crouchWalkTrack.Play(0.15);
					}
				} else {
					if (!crouchIdleTrack.IsPlaying) {
						idleTrack.Stop(0.15);
						walkTrack.Stop(0.15);
						crouchWalkTrack.Stop(0.15);
						crouchIdleTrack.Play(0.15);
					}
				}
			}
		} else {
			if (isMoving) {
				if (!walkTrack.IsPlaying) {
					idleTrack.Stop(0.15);
					walkTrack.Play(0.15);
					if (crouchWalkTrack) crouchWalkTrack.Stop(0.15);
					if (crouchIdleTrack) crouchIdleTrack.Stop(0.15);
				}
				walkTrack.AdjustSpeed(isSprinting ? SPRINT_ANIM_SPEED * 0.75 : 0.75);
			} else {
				if (!idleTrack.IsPlaying) {
					walkTrack.Stop(0.15);
					idleTrack.Play(0.15);
					if (crouchWalkTrack) crouchWalkTrack.Stop(0.15);
					if (crouchIdleTrack) crouchIdleTrack.Stop(0.15);
				}
			}
		}
	});
}

function findPlayerRig(player: Player): Model | undefined {
	for (const child of Workspace.GetChildren()) {
		if (child.GetAttribute("controlledBy") === player.UserId && child.IsA("Model")) {
			return child as Model;
		}
	}
	return undefined;
}

function cleanupRig(player: Player) {
	const rig = findPlayerRig(player);
	if (rig) rig.Destroy();
}

Players.PlayerAdded.Connect((player) => {
	player.GetAttributeChangedSignal("role").Connect(() => {
		const role = player.GetAttribute("role") as string | undefined;
		if (role === "Attacker") {
			spawnRigForPlayer(player);
		}
	});

	player.CharacterAdded.Connect((character) => {
		const role = player.GetAttribute("role") as string | undefined;
		if (role === "Attacker") {
			task.wait(0.2);
			spawnRigForPlayer(player);
		}
	});
});

Players.PlayerRemoving.Connect((player) => {
	cleanupRig(player);
});

print("Attacker rig server module loaded!");
