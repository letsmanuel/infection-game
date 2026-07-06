import Net from "@rbxts/net";
import { Players } from "@rbxts/services";

const Remotes = Net.CreateDefinitions({
    exampleClientToserver: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 10 })]),
    exampleServerToClient: Net.Definitions.ServerToClientEvent<[]>(),

    // ready up system

    readyUp: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 500 })]),
    startGame: Net.Definitions.ServerToClientEvent<[role: string]>(),


    // order system
    placeOrder: Net.Definitions.ClientToServerEvent<[object: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),

    //environment interactions
    startupFan: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 3 })]),


    // dragging/pickup system
    pickupObject: Net.Definitions.ClientToServerEvent<[target: Instance]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    dropObject: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    interactObject: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 30 })]),
    objectHeldChanged: Net.Definitions.ServerToClientEvent<[holder: Player, target: Instance | undefined]>(),

    // placement system
    requestPlace: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    confirmPlace: Net.Definitions.ClientToServerEvent<[cframe: CFrame]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    cancelPlace: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 15 })]),
    placeGhostChanged: Net.Definitions.ServerToClientEvent<[ghost: Instance | undefined, placer: Player]>(),

    // shop availability
    checkOrderAvailability: Net.Definitions.ClientToServerEvent<[]>(),
    orderAvailabilityResponse: Net.Definitions.ServerToClientEvent<[available: boolean]>(),
});


export default Remotes;