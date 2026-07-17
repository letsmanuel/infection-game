import { Players, Workspace, ServerStorage, ReplicatedStorage, RunService } from "@rbxts/services";
import Remotes, { RemoteId } from "shared/remotes";
import { DeliveryOptions } from "shared/configs/deliveryOptions";

function getOrCreateScrapIntValue(): IntValue {
	const existing = ReplicatedStorage.FindFirstChild("ScrapAmount") as IntValue | undefined;
	if (existing) return existing;
	const iv = new Instance("IntValue");
	iv.Name = "ScrapAmount";
	iv.Value = 0;
	iv.Parent = ReplicatedStorage;
	return iv;
}

const scrapAmount = getOrCreateScrapIntValue();

const orderRemote = Remotes.Server.Get(RemoteId.placeOrder);
const checkAvailabilityRemote = Remotes.Server.Get(RemoteId.checkOrderAvailability);
const availabilityResponse = Remotes.Server.Get(RemoteId.orderAvailabilityResponse);
const vanRouteStart = Remotes.Server.Get(RemoteId.vanRouteStart);
const vanCorrection = Remotes.Server.Get(RemoteId.vanCorrection);

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

const CATEGORY_WINDOW = 60;
const recentOrdersByCategory = new Map<string, number[]>();

function canOrderCategory(category: string): boolean {
    const now = os.clock();
    let timestamps = recentOrdersByCategory.get(category);
    if (!timestamps) return true;

    timestamps = timestamps.filter((t) => now - t < CATEGORY_WINDOW);
    recentOrdersByCategory.set(category, timestamps);

    const limit = DeliveryOptions.CategoryLimits[category] ?? 999;
    return timestamps.size() < limit;
}

function recordOrderCategory(category: string) {
    const timestamps = recentOrdersByCategory.get(category) ?? [];
    timestamps.push(os.clock());
    recentOrdersByCategory.set(category, timestamps);
}

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

function computeWaypointDistances(waypoints: Vector3[]): number[] {
	const distances: number[] = [];
	for (let i = 0; i < waypoints.size() - 1; i++) {
		distances.push(waypoints[i + 1].sub(waypoints[i]).Magnitude);
	}
	return distances;
}

function computeVanPosition(waypoints: Vector3[], segmentDistances: number[], dropoffIndex: number, elapsed: number): { position: Vector3; atDropoff: boolean; done: boolean } {
	let remaining = elapsed;
	let totalDist = 0;

	for (let i = 0; i < segmentDistances.size(); i++) {
		const segDist = segmentDistances[i];
		const segTime = segDist / TRAVEL_SPEED;
		const pauseTime = (i + 1 === dropoffIndex) ? DROPOFF_PAUSE : 0;

		if (remaining <= segTime) {
			const t = remaining / segTime;
			const pos = waypoints[i].Lerp(waypoints[i + 1], t);
			const atDropoff = (i + 1 === dropoffIndex) && t >= (segDist - DECEL_LOOKAHEAD) / segDist;
			return { position: pos, atDropoff, done: false };
		}

		remaining -= segTime;

		if (remaining <= pauseTime) {
			const pos = waypoints[i + 1];
			return { position: pos, atDropoff: (i + 1 === dropoffIndex), done: false };
		}

		remaining -= pauseTime;
	}

	return { position: waypoints[waypoints.size() - 1], atDropoff: false, done: true };
}

function handleDeliveryViaTimer(
	delivererClone: Model,
	waypoints: Attachment[],
	productId: string,
	deliveryMethod: string,
	weight: number,
	randomDropoffPoint: Attachment,
	dropoffParentFolder: Folder,
	orderingPlayer: Player,
) {
	if (waypoints.size() < 2) {
		delivererClone.Destroy();
		return;
	}

	const rootPart = delivererClone.PrimaryPart ?? delivererClone.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!rootPart) {
		warn("[OrderHandler] No PrimaryPart or root part on deliverer");
		delivererClone.Destroy();
		return;
	}

	const vanId = `Van_${tostring(os.clock())}_${deliveryMethod}`;
	const vanIdValue = new Instance("StringValue");
	vanIdValue.Name = "VanId";
	vanIdValue.Value = vanId;
	vanIdValue.Parent = delivererClone;

	const soundPaths = SOUND_PATHS[deliveryMethod];
	const drivingSound = soundPaths?.driving ? resolveSoundFromPath(delivererClone, soundPaths.driving) : undefined;
	const honkSound = soundPaths?.honk ? resolveSoundFromPath(delivererClone, soundPaths.honk) : undefined;

	delivererClone.SetPrimaryPartCFrame(new CFrame(waypoints[0].WorldPosition));
	(rootPart as BasePart).CFrame = new CFrame(waypoints[0].WorldPosition);
	pcall(() => {
		(rootPart as BasePart).SetNetworkOwner(orderingPlayer);
	});

	const waypointPositions = waypoints.map((w) => w.WorldPosition);
	const segmentDistances = computeWaypointDistances(waypointPositions);
	const dropoffIndex = waypoints.findIndex((w) => w.GetAttribute("dropoff") === true);

	for (let i = 0; i < waypoints.size(); i++) {
		print(`[OrderHandler] Waypoint ${i} dropoff=${waypoints[i].GetAttribute("dropoff")} pos=${waypoints[i].WorldPosition}`);
	}

	if (dropoffIndex < 0) {
		warn(`[OrderHandler] No dropoff waypoint found for ${deliveryMethod}! ${waypoints.size()} waypoints checked.`);
		delivererClone.Destroy();
		return;
	}
	const startTime = os.clock();

	let totalTravelTime = 0;
	for (const d of segmentDistances) {
		totalTravelTime += d / TRAVEL_SPEED;
	}
	if (dropoffIndex >= 0) {
		totalTravelTime += DROPOFF_PAUSE;
	}

	let distToDropoff = 0;
	for (let i = 0; i < dropoffIndex && i < segmentDistances.size(); i++) {
		distToDropoff += segmentDistances[i];
	}
	const timeToDropoff = distToDropoff / TRAVEL_SPEED;

	print(`[OrderHandler] Delivery | vanId=${vanId} dropoffIdx=${dropoffIndex} distToDropoff=${"%.1f".format(distToDropoff)} timeToDropoff=${"%.1f".format(timeToDropoff)}s totalTravel=${"%.1f".format(totalTravelTime)}s`);
	vanRouteStart.SendToAllPlayers(vanId, waypointPositions, deliveryMethod, dropoffIndex, startTime);

	playSound(drivingSound);

	task.spawn(() => {
		if (timeToDropoff > 0) {
			const correctionInterval = 1;
			let lastCorrection = os.clock();
			const correctionEnd = startTime + totalTravelTime;

			while (os.clock() < startTime + timeToDropoff) {
				const now = os.clock();
				if (now - lastCorrection >= correctionInterval) {
					lastCorrection = now;
					const el = now - startTime;
					const pos = computeVanPosition(waypointPositions, segmentDistances, dropoffIndex, el);
					vanCorrection.SendToAllPlayers(vanId, pos.position, now);
				}
				task.wait(0.2);
			}
		}

		stopSound(drivingSound);

		print(`[OrderHandler] SPAWNING package | vanId=${vanId} product=${productId}`);

		const hoverHeight = MIN_PACKAGE_HOVER_HEIGHT +
			math.random() * (MAX_PACKAGE_HOVER_HEIGHT - MIN_PACKAGE_HOVER_HEIGHT);

		const packageClone = packageTemplate.Clone();
		packageClone.Name = "Package";
		packageClone.Position = randomDropoffPoint.WorldPosition.add(new Vector3(0, hoverHeight, 0));
		packageClone.SetAttribute("productId", productId);
		packageClone.SetAttribute("deliveredBy", deliveryMethod);
		packageClone.SetAttribute("weight", weight);
		packageClone.Parent = dropoffParentFolder;

		task.wait(DROPOFF_PAUSE);

		playSound(honkSound);

		const remainingTime = totalTravelTime - timeToDropoff - DROPOFF_PAUSE;
		if (remainingTime > 0) {
			task.wait(remainingTime);
		}

		stopSound(drivingSound);
		stopSound(honkSound);
		delivererClone.Destroy();
	});
}

let instance: OrderHandler;

export function getOrderHandler(): OrderHandler {
	return instance;
}

export class OrderHandler {
    start() {
        instance = this;

        checkAvailabilityRemote.Connect((player) => {
            const available = canOrderCategory("oldShop");
            availabilityResponse.SendToPlayer(player, available);
        });

        orderRemote.Connect((player, order) => {

            if (player.GetAttribute("role") === "Attacker") {
                print(`Player ${player.Name} attempted to place an order while being an Attacker.`);
                return;
            }

            const matchedProduct = DeliveryOptions.Products.find((p) => p.id === order);
            if (!matchedProduct) {
                print(`Invalid order received from player ${player.Name}: ${order}`);
                return;
            }

            const cost = matchedProduct.scrapCost;
            if (scrapAmount.Value < cost) {
                print(`Player ${player.Name} doesn't have enough scrap (need ${cost}, have ${scrapAmount.Value})`);
                availabilityResponse.SendToPlayer(player, false);
                return;
            }

            if (!canOrderCategory(matchedProduct.category)) {
                print(`Rate limit hit for category "${matchedProduct.category}" by ${player.Name}`);
                return;
            }

            recordOrderCategory(matchedProduct.category);
            scrapAmount.Value -= cost;
            print(`[OrderHandler] ${player.Name} ordered ${order}, deducted ${cost} scrap (remaining: ${scrapAmount.Value})`);

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
                handleDeliveryViaTimer(
                    delivererClone,
                    waypoints,
                    order,
                    randomDeliveryMethod,
                    matchedProduct.weight ?? 1,
                    randomDropoffPoint,
                    DeliveredPackagesFolder,
                    player,
                );
            });
        });
    }

    placeFreeOrder(player: Player, orderId: string) {
        const matchedProduct = DeliveryOptions.Products.find((p) => p.id === orderId);
        if (!matchedProduct) {
            print(`[OrderHandler/CMD] Invalid product: ${orderId}`);
            return;
        }

        const randomDeliveryMethod = DeliveryOptions.Methods[math.random(0, DeliveryOptions.Methods.size() - 1)];

        const ourRouteFolder = RoutesFolder.FindFirstChild(randomDeliveryMethod) as Folder;
        if (!ourRouteFolder) {
            print(`[OrderHandler/CMD] No route folder for: ${randomDeliveryMethod}`);
            return;
        }

        const ourDelivererObject = orderAssetsFolder.FindFirstChild(randomDeliveryMethod) as Model;
        if (!ourDelivererObject) {
            print(`[OrderHandler/CMD] No deliverer object for: ${randomDeliveryMethod}`);
            return;
        }

        const methodDropoffFolder = DropoffPointsFolder.FindFirstChild(randomDeliveryMethod) as Folder;
        if (!methodDropoffFolder) {
            print(`[OrderHandler/CMD] No dropoff folder for: ${randomDeliveryMethod}`);
            return;
        }

        const dropoffChildren = methodDropoffFolder.GetChildren().filter((c): c is Attachment => c.IsA("Attachment"));
        if (dropoffChildren.size() === 0) {
            print("[OrderHandler/CMD] No dropoff points found");
            return;
        }
        const randomDropoffPoint = dropoffChildren[math.random(0, dropoffChildren.size() - 1)];

        const waypoints = getSortedWaypoints(ourRouteFolder);
        if (waypoints.size() === 0) {
            print("[OrderHandler/CMD] No waypoints found");
            return;
        }

        const delivererClone = ourDelivererObject.Clone();
        delivererClone.Name = `${randomDeliveryMethod}_Deliverer_CMD`;
        delivererClone.Parent = DeliverersTempFolder;
        delivererClone.SetAttribute("targetPackage", orderId);

        print(`[OrderHandler/CMD] Free order | player=${player.Name} product=${orderId} method=${randomDeliveryMethod}`);

        task.spawn(() => {
            handleDeliveryViaTimer(
                delivererClone,
                waypoints,
                orderId,
                randomDeliveryMethod,
                matchedProduct.weight ?? 1,
                randomDropoffPoint,
                DeliveredPackagesFolder,
                player,
            );
        });
    }

    spawnItem(player: Player, orderId: string) {
        const productsFolder = ServerStorage.FindFirstChild("Products") as Folder | undefined;
        if (!productsFolder) {
            print("[OrderHandler/CMD] Products folder not found");
            return;
        }

        const productModel = productsFolder.FindFirstChild(orderId) as Instance | undefined;
        if (!productModel) {
            print(`[OrderHandler/CMD] Product model not found: ${orderId}`);
            return;
        }

        const character = player.Character;
        if (!character) return;
        const rootPart = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
        if (!rootPart) return;

        const spawnPos = rootPart.Position.add(rootPart.CFrame.LookVector.mul(5));

        const clone = productModel.Clone();
        clone.Parent = Workspace;

        if (clone.IsA("BasePart")) {
            clone.Position = spawnPos;
        } else if (clone.IsA("Model")) {
            const primary = clone.PrimaryPart ?? clone.FindFirstChildWhichIsA("BasePart") as BasePart | undefined;
            if (primary) {
                clone.PrimaryPart = primary;
                clone.SetPrimaryPartCFrame(new CFrame(spawnPos));
            }
        }

        print(`[OrderHandler/CMD] Spawned item | player=${player.Name} product=${orderId} pos=${spawnPos}`);
    }
}