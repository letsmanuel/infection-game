import { sayStarted } from "shared/startupMessages";
import { Lighting } from "@rbxts/services"

Lighting.TimeOfDay = "20:00:00";
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

// game imports

import { ReadySystem } from "./readySystem/readySystem";
import { OrderHandler } from "./orderHandler";
import { FanStatus } from "./enviroment/fanStatus";
import { SpecialCode } from "./enviroment/specialCode";

const fanStatusHandler = new FanStatus();
fanStatusHandler.start();

const readySystem = new ReadySystem();
readySystem.start();

const deliverySystem = new OrderHandler();
deliverySystem.start();

const specialCodeSystem = new SpecialCode();
specialCodeSystem.start();


print(sayStarted("main.server.ts"));
