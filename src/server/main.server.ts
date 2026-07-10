import { sayStarted } from "shared/startupMessages";
import { Lighting, Players } from "@rbxts/services"

Lighting.TimeOfDay = "20:00:00";
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

(Players as unknown as { CharacterAutoLoads: boolean }).CharacterAutoLoads = false;

// game imports

import { ReadySystem } from "./readySystem/readySystem";
import { OrderHandler } from "./orderHandler";
import { FanStatus } from "./enviroment/fanStatus";
import { SpecialCode } from "./enviroment/specialCode";
import "server/lootSystem";
import "server/lightDamage";

const fanStatusHandler = new FanStatus();
fanStatusHandler.start();

const readySystem = new ReadySystem();
readySystem.start();

const deliverySystem = new OrderHandler();
deliverySystem.start();

const specialCodeSystem = new SpecialCode();
specialCodeSystem.start();


print(sayStarted("main.server.ts"));
