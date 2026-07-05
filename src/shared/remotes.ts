import Net from "@rbxts/net";
import { Players } from "@rbxts/services";

const Remotes = Net.CreateDefinitions({
    exampleClientToserver: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 10 })]),
    exampleServerToClient: Net.Definitions.ServerToClientEvent<[]>(),

    // ready up system

    readyUp: Net.Definitions.ClientToServerEvent<[tool: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 500 })]),
    startGame: Net.Definitions.ServerToClientEvent<[role: string]>(),


    // order system
    placeOrder: Net.Definitions.ClientToServerEvent<[object: string]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 6 })]),

    //environment interactions
    startupFan: Net.Definitions.ClientToServerEvent<[]>([Net.Middleware.RateLimit({ MaxRequestsPerMinute: 3 })]),

});


export default Remotes;