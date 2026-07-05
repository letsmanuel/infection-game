import { sayStarted } from "shared/startupMessages";
import { Lighting } from "@rbxts/services"

Lighting.TimeOfDay = "20:00:00";
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

// game imports

import { ReadySystem } from "./readySystem/readySystem";

const readySystem = new ReadySystem();
readySystem.start();


print(sayStarted("main.server.ts"));
