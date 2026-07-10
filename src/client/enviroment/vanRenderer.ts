import { Players, RunService, Workspace } from "@rbxts/services";
import Remotes from "shared/remotes";

const vanRouteStart = Remotes.Client.Get("vanRouteStart");
const vanCorrection = Remotes.Client.Get("vanCorrection");

const TRAVEL_SPEED = 20;
const MIN_APPROACH_SPEED = 0.6;
const ACCEL_RATE = 4;
const DECEL_LOOKAHEAD = 6;
const DROPOFF_PAUSE = 1.5;
const ARRIVAL_THRESHOLD = 0.5;
const CORRECTION_THRESHOLD = 20;

const FACING_CORRECTIONS: Record<string, CFrame> = {
	Van: CFrame.Angles(0, math.rad(90), 0),
};

interface VanState {
	rootPart: BasePart;
	waypoints: Vector3[];
	deliveryMethod: string;
	dropoffIndex: number;
	startTime: number;
	currentSpeed: number;
	currentWaypointIndex: number;
	hasSpawnedPackage: boolean;
	paused: boolean;
	pauseUntil: number;
	lastServerPosition?: Vector3;
	lastServerTimestamp?: number;
}

const activeVans = new Map<string, VanState>();

function findVanRoot(vanId: string): BasePart | undefined {
	const deliverersTemp = Workspace.FindFirstChild("Delivery")?.FindFirstChild("DeliverersTemp");
	if (!deliverersTemp) return;
	for (const child of deliverersTemp.GetChildren()) {
		const vanIdValue = child.FindFirstChild("VanId") as StringValue | undefined;
		if (vanIdValue && vanIdValue.Value === vanId && child.IsA("Model")) {
			const primary = child.PrimaryPart;
			const root = primary ?? child.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
			return root;
		}
	}
}

vanRouteStart.Connect((vanId, waypoints, deliveryMethod, dropoffIndex, startTime) => {
	print(`[VanRenderer] Route start | vanId=${vanId} waypoints=${waypoints.size()} dropoffIdx=${dropoffIndex}`);
	const rootPart = findVanRoot(vanId);
	if (!rootPart) {
		warn(`[VanRenderer] Van root part not found for ${vanId}`);
		return;
	}

	const state: VanState = {
		rootPart,
		waypoints,
		deliveryMethod,
		dropoffIndex,
		startTime,
		currentSpeed: TRAVEL_SPEED,
		currentWaypointIndex: 0,
		hasSpawnedPackage: false,
		paused: false,
		pauseUntil: 0,
	};
	activeVans.set(vanId, state);

	rootPart.CFrame = new CFrame(waypoints[0]);
});

vanCorrection.Connect((vanId, serverPos, serverTimestamp) => {
	const state = activeVans.get(vanId);
	if (!state) return;

	const localPos = state.rootPart.Position;
	const delta = serverPos.sub(localPos).Magnitude;

	if (delta > CORRECTION_THRESHOLD) {
		print(`[VanRenderer] CORRECTION | vanId=${vanId} delta=${"%.1f".format(delta)}`);
		state.rootPart.CFrame = new CFrame(serverPos);
	}
});

function updateVan(dt: number, state: VanState) {
	if (state.currentWaypointIndex >= state.waypoints.size() - 1) return;

	const toPoint = state.waypoints[state.currentWaypointIndex + 1];
	const isDropoff = state.currentWaypointIndex + 1 === state.dropoffIndex;

	const currentPos = state.rootPart.Position;
	const toTarget = toPoint.sub(currentPos);
	const distanceRemaining = toTarget.Magnitude;

	if (state.paused) {
		if (os.clock() < state.pauseUntil) return;
		state.paused = false;
		state.currentSpeed = TRAVEL_SPEED;
	}

	if (distanceRemaining < 0.05) {
		state.currentWaypointIndex += 1;
		return;
	}

	const direction = toTarget.Unit;

	let targetSpeed = TRAVEL_SPEED;
	if (isDropoff && distanceRemaining <= DECEL_LOOKAHEAD) {
		const t = distanceRemaining / DECEL_LOOKAHEAD;
		targetSpeed = math.max(MIN_APPROACH_SPEED, TRAVEL_SPEED * t);
	}

	if (state.currentSpeed < targetSpeed) {
		state.currentSpeed = math.min(targetSpeed, state.currentSpeed + ACCEL_RATE * dt);
	} else if (state.currentSpeed > targetSpeed) {
		state.currentSpeed = math.max(targetSpeed, state.currentSpeed - ACCEL_RATE * dt);
	}

	const moveDistance = math.min(state.currentSpeed * dt, distanceRemaining);
	const newPos = currentPos.add(direction.mul(moveDistance));
	let lookCFrame = CFrame.lookAt(newPos, newPos.add(direction));

	const facingCorrection = FACING_CORRECTIONS[state.deliveryMethod];
	if (facingCorrection) {
		lookCFrame = lookCFrame.mul(facingCorrection);
	}

	state.rootPart.CFrame = lookCFrame;

	if (isDropoff && !state.hasSpawnedPackage && distanceRemaining <= ARRIVAL_THRESHOLD) {
		state.hasSpawnedPackage = true;
		state.currentSpeed = 0;
		state.paused = true;
		state.pauseUntil = os.clock() + DROPOFF_PAUSE;
	}
}

RunService.RenderStepped.Connect((dt) => {
	for (const [, state] of activeVans) {
		updateVan(dt, state);
	}
});

print("[VanRenderer] loaded");
