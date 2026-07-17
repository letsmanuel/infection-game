import Net from "@rbxts/net";
import { Players } from "@rbxts/services";

/**
 * @uuid
 */
export const enum RemoteId {
    GetPlayerInventory = "GetPlayerInventory",
    exampleClientToserver = "exampleClientToserver",
    exampleServerToClient = "exampleServerToClient",
    readyUp = "readyUp",
    startGame = "startGame",
    placeOrder = "placeOrder",
    startupFan = "startupFan",
    pickupObject = "pickupObject",
    dropObject = "dropObject",
    interactObject = "interactObject",
    objectHeldChanged = "objectHeldChanged",
    requestPlace = "requestPlace",
    confirmPlace = "confirmPlace",
    cancelPlace = "cancelPlace",
    placeGhostChanged = "placeGhostChanged",
    checkOrderAvailability = "checkOrderAvailability",
    orderAvailabilityResponse = "orderAvailabilityResponse",
    attackerAnimState = "attackerAnimState",
    vanRouteStart = "vanRouteStart",
    vanCorrection = "vanCorrection",
    fallDamageEffect = "fallDamageEffect",
    giveClientHint = "giveClientHint",
    updateWalkSpeed = "updateWalkSpeed",
    gameStateChanged = "gameStateChanged",
    powerOutageState = "powerOutageState",
    electricalBoxStep = "electricalBoxStep",
    powerOutageMainStart = "powerOutageMainStart",
}

const Remotes = Net.CreateDefinitions({
    [RemoteId.exampleClientToserver]: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 10 })]),
    [RemoteId.exampleServerToClient]: Net.Definitions.ServerToClientEvent<[]>(),

    // ready up system

    [RemoteId.readyUp]: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 500 })]),
    [RemoteId.startGame]: Net.Definitions.ServerToClientEvent<[role: string]>(),


    // order system
    [RemoteId.placeOrder]: Net.Definitions.ClientToServerEvent<[object: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),

    //environment interactions
    [RemoteId.startupFan]: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 3 })]),


    // dragging/pickup system
    [RemoteId.pickupObject]: Net.Definitions.ClientToServerEvent<[target: Instance]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    [RemoteId.dropObject]: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    [RemoteId.interactObject]: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    [RemoteId.objectHeldChanged]: Net.Definitions.ServerToClientEvent<[holder: Player, target: Instance | undefined]>(),

    // placement system
    [RemoteId.requestPlace]: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    [RemoteId.confirmPlace]: Net.Definitions.ClientToServerEvent<[cframe: CFrame]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    [RemoteId.cancelPlace]: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    [RemoteId.placeGhostChanged]: Net.Definitions.ServerToClientEvent<[ghost: Instance | undefined, placer: Player]>(),

    // shop availability
    [RemoteId.checkOrderAvailability]: Net.Definitions.ClientToServerEvent<[]>(),
    [RemoteId.orderAvailabilityResponse]: Net.Definitions.ServerToClientEvent<[available: boolean]>(),

    // attacker animation sync
    [RemoteId.attackerAnimState]: Net.Definitions.ClientToServerEvent<[isMoving: boolean, isSprinting: boolean, isCrouching: boolean]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 3600 })]),

    // van client-side prediction
    [RemoteId.vanRouteStart]: Net.Definitions.ServerToClientEvent<[vanModelId: string, waypoints: Vector3[], deliveryMethod: string, dropoffIndex: number, startTime: number]>(),
    [RemoteId.vanCorrection]: Net.Definitions.ServerToClientEvent<[vanModelId: string, position: Vector3, timestamp: number]>(),

    // fall damage
    [RemoteId.fallDamageEffect]: Net.Definitions.ServerToClientEvent<[fallDistance: number, landedInWater: boolean]>(),

    // give hints
    [RemoteId.giveClientHint]: Net.Definitions.ServerToClientEvent<[hint: string]>(),

    // walk speed sync
    [RemoteId.updateWalkSpeed]: Net.Definitions.ClientToServerEvent<[walkSpeed: number]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 5000 })]),

    // game state
    [RemoteId.gameStateChanged]: Net.Definitions.ServerToClientEvent<[state: string]>(),

    // power outage event
    [RemoteId.powerOutageState]: Net.Definitions.ServerToClientEvent<[active: boolean]>(),
    [RemoteId.electricalBoxStep]: Net.Definitions.ClientToServerEvent<[step: string]>(),
    [RemoteId.powerOutageMainStart]: Net.Definitions.ServerToClientEvent<[]>(),
});


export default Remotes;