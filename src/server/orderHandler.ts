import { Players, Workspace, ServerStorage, ReplicatedStorage, RunService } from "@rbxts/services";
import Remotes from "shared/remotes";
import { DeliveryOptions } from "shared/configs/deliveryOptions";

const orderRemote = Remotes.Server.Get("placeOrder");

const orderAssetsFolder = ServerStorage.WaitForChild("DeliveryAssets") as Folder;
const packageTemplate = orderAssetsFolder.WaitForChild("Package") as BasePart;

const DeliveryFolder = Workspace.WaitForChild("Delivery") as Folder;
const DeliveredPackagesFolder = DeliveryFolder.WaitForChild("DeliveredPackages") as Folder;
const RoutesFolder = DeliveryFolder.WaitForChild("Routes") as Folder;
const DropoffPointsFolder = DeliveryFolder.WaitForChild("DropoffPoints") as Folder;
const DeliverersTempFolder = DeliveryFolder.WaitForChild("DeliverersTemp") as Folder;

const TRAVEL_SPEED = 20; // studs per second, normal cruise speed
const MIN_APPROACH_SPEED = 0.6; // studs per second, minimum speed near dropoff
const ACCEL_RATE = 4; // studs per second^2, how fast speed ramps up/down
const DECEL_LOOKAHEAD = 6; // studs before a dropoff waypoint to start slowing
const DROPOFF_PAUSE = 1.5; // seconds paused at the dropoff waypoint
const MIN_PACKAGE_HOVER_HEIGHT = 3; // studs above the dropoff point to spawn the package
const MAX_PACKAGE_HOVER_HEIGHT = 5; // studs above the dropoff point to spawn the package
const ARRIVAL_THRESHOLD = 0.5; // studs, how close counts as "reached" the dropoff waypoint

const FACING_CORRECTIONS: Record<string, CFrame> = {
    Van: CFrame.Angles(0, math.rad(90), 0),
};

const SOUND_PATHS: Record<string, { driving?: string; honk?: string }> = {
    Van: { driving: ".driving", honk: ".honk" },
};

function getSortedWaypoints(routeFolder: Folder): Attachment[] {
    const waypoints = routeFolder.GetChildren().filter((c): c is Attachment => c.IsA("Attachment"));
    waypoints.sort((a, b) => {
        const numA = tonumber(a.Name) ?? 0;
        const numB = tonumber(b.Name) ?? 0;
        return numA < numB;
    });
    return waypoints;
}

function resolveSoundFromPath(root: Instance, path: string): Sound | undefined {
    const segments = path.split(".").filter((s) => s.size() > 0);
    let current: Instance | undefined = root;

    for (const segment of segments) {
        if (!current) return undefined;
        current = current.FindFirstChild(segment);
    }

    if (current && current.IsA("Sound")) {
        return current;
    }

    return undefined;
}

function playSound(sound?: Sound) {
    if (!sound) return;
    sound.Stop();
    sound.Play();
}

function stopSound(sound?: Sound) {
    if (!sound) return;
    sound.Stop();
}

function moveDelivererAlongRoute(
    delivererClone: Model,
    waypoints: Attachment[],
    productId: string,
    deliveryMethod: string,
    weight: number,
    randomDropoffPoint: Attachment,
    dropoffParentFolder: Folder,
) {
    const primaryPart = delivererClone.PrimaryPart;
    if (!primaryPart || waypoints.size() === 0) {
        delivererClone.Destroy();
        return;
    }

    const facingCorrection = FACING_CORRECTIONS[deliveryMethod];
    const soundPaths = SOUND_PATHS[deliveryMethod];

    const drivingSound = soundPaths?.driving
        ? resolveSoundFromPath(delivererClone, soundPaths.driving)
        : undefined;
    const honkSound = soundPaths?.honk
        ? resolveSoundFromPath(delivererClone, soundPaths.honk)
        : undefined;

    delivererClone.SetPrimaryPartCFrame(new CFrame(waypoints[0].WorldPosition));

    playSound(drivingSound);

    let currentSpeed = TRAVEL_SPEED;
    let hasDeliveredPackage = false;

    for (let i = 0; i < waypoints.size() - 1; i++) {
        const toPoint = waypoints[i + 1];
        const isDropoff = toPoint.GetAttribute("dropoff") === true;
        let hasSpawnedPackage = false;

        while (true) {
            const dt = RunService.Heartbeat.Wait()[0];

            const currentPos = primaryPart.Position;
            const targetPos = toPoint.WorldPosition;
            const toTarget = targetPos.sub(currentPos);
            const distanceRemaining = toTarget.Magnitude;

            if (distanceRemaining < 0.05) {
                break;
            }

            const direction = toTarget.Unit;

            let targetSpeed = TRAVEL_SPEED;
            if (isDropoff && distanceRemaining <= DECEL_LOOKAHEAD) {
                const t = distanceRemaining / DECEL_LOOKAHEAD;
                targetSpeed = math.max(MIN_APPROACH_SPEED, TRAVEL_SPEED * t);
            }

            if (currentSpeed < targetSpeed) {
                currentSpeed = math.min(targetSpeed, currentSpeed + ACCEL_RATE * dt);
            } else if (currentSpeed > targetSpeed) {
                currentSpeed = math.max(targetSpeed, currentSpeed - ACCEL_RATE * dt);
            }

            const moveDistance = math.min(currentSpeed * dt, distanceRemaining);
            const newPos = currentPos.add(direction.mul(moveDistance));
            let lookCFrame = CFrame.lookAt(newPos, newPos.add(direction));

            if (facingCorrection) {
                lookCFrame = lookCFrame.mul(facingCorrection);
            }

            delivererClone.SetPrimaryPartCFrame(lookCFrame);

            if (isDropoff && !hasSpawnedPackage && distanceRemaining <= ARRIVAL_THRESHOLD) {
                hasSpawnedPackage = true;
                currentSpeed = 0;

                stopSound(drivingSound);

                const hoverHeight = MIN_PACKAGE_HOVER_HEIGHT +
                    math.random() * (MAX_PACKAGE_HOVER_HEIGHT - MIN_PACKAGE_HOVER_HEIGHT);

                const packageClone = packageTemplate.Clone();
                packageClone.Name = productId;
                packageClone.Position = randomDropoffPoint.WorldPosition.add(
                    new Vector3(0, hoverHeight, 0),
                );
                packageClone.SetAttribute("productId", productId);
                packageClone.SetAttribute("deliveredBy", deliveryMethod);
                packageClone.SetAttribute("weight", weight);
                packageClone.Parent = dropoffParentFolder;

                hasDeliveredPackage = true;

                task.wait(DROPOFF_PAUSE);

                playSound(honkSound);
                playSound(drivingSound);
            }
        }
    }

    stopSound(drivingSound);
    stopSound(honkSound);
    delivererClone.Destroy();
}

export class OrderHandler {
    start() {
        orderRemote.Connect((player, order) => {
            const matchedProduct = DeliveryOptions.Products.find((p) => p.id === order);
            if (!matchedProduct) {
                print(`Invalid order received from player ${player.Name}: ${order}`);
                return;
            }

            const randomDeliveryMethod =
                DeliveryOptions.Methods[math.random(0, DeliveryOptions.Methods.size() - 1)];

            const ourRouteFolder = RoutesFolder.FindFirstChild(randomDeliveryMethod) as Folder;
            if (!ourRouteFolder) {
                print(`No route folder found for delivery method: ${randomDeliveryMethod}`);
                return;
            }

            const ourDelivererObject = orderAssetsFolder.FindFirstChild(randomDeliveryMethod) as Model;
            if (!ourDelivererObject) {
                print(`No deliverer object found for delivery method: ${randomDeliveryMethod}`);
                return;
            }

            const methodDropoffFolder = DropoffPointsFolder.FindFirstChild(randomDeliveryMethod) as Folder;
            if (!methodDropoffFolder) {
                print(`No dropoff points folder found for delivery method: ${randomDeliveryMethod}`);
                return;
            }

            const dropoffChildren = methodDropoffFolder.GetChildren().filter(
                (c): c is Attachment => c.IsA("Attachment"),
            );
            if (dropoffChildren.size() === 0) {
                print(`No dropoff point attachments found for delivery method: ${randomDeliveryMethod}`);
                return;
            }
            const randomDropoffPoint = dropoffChildren[math.random(0, dropoffChildren.size() - 1)];

            const waypoints = getSortedWaypoints(ourRouteFolder);
            if (waypoints.size() === 0) {
                print(`No waypoints found in route folder for: ${randomDeliveryMethod}`);
                return;
            }

            const delivererClone = ourDelivererObject.Clone();
            delivererClone.Name = `${randomDeliveryMethod}_Deliverer`;
            delivererClone.Parent = DeliverersTempFolder;
            delivererClone.SetAttribute("targetPackage", order);

            task.spawn(() => {
                moveDelivererAlongRoute(
                    delivererClone,
                    waypoints,
                    order,
                    randomDeliveryMethod,
                    matchedProduct.weight ?? 1,
                    randomDropoffPoint,
                    DeliveredPackagesFolder,
                );
            });
        });
    }
}