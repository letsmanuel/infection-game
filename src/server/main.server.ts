import { sayStarted } from "shared/startupMessages";
import { Lighting, Players } from "@rbxts/services"
import { Centurion } from "@rbxts/centurion";

// commands
import "server/commands/orderCommands";
import "server/commands/eventCommands";

Lighting.TimeOfDay = "20:00:00";
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

(Players as unknown as { CharacterAutoLoads: boolean }).CharacterAutoLoads = false;

// game imports

import { ReadySystem } from "./readySystem/readySystem";
import { OrderHandler } from "./orderHandler";
import { FanStatus } from "./enviroment/fanStatus";
import { SpecialCode } from "./enviroment/specialCode";
import { PowerOutageController } from "./events/powerOutage";
import "server/lootSystem";
import "server/lightDamage";
import "server/movement/hurt";

const fanStatusHandler = new FanStatus();
fanStatusHandler.start();

const readySystem = new ReadySystem();
readySystem.start();

const deliverySystem = new OrderHandler();
deliverySystem.start();

const specialCodeSystem = new SpecialCode();
specialCodeSystem.start();

const powerOutageController = new PowerOutageController();
powerOutageController.start();

Centurion.server({
    syncFilter: () => true,
}).start();
print("[Centurion] Server started");


print(sayStarted("main.server.ts"));
