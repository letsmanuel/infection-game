import { sayStarted } from "shared/startupMessages";
import { ContentProvider, Lighting, Players } from "@rbxts/services";

// GAME IMPORTS
import { FirstPersonLock } from "./camera/firstPersonLock";
import { CrouchModule } from "./movement/crouching";
import { SprintModule } from "./movement/sprinting";
import { FootstepsClient } from "./sounds/footstepSounds";
import { DefaultSoundMuter } from "./sounds/defaultSoundMuter";
import { FallDamageModule } from "./movement/hurt";
import { AmbientMusicModule } from "./sounds/ambientMusic";
import { BrightnessAdjustModule } from "./camera/brightnessAdjust";
import { handleReady } from "./menu/handleReady";

const LIGHTING_TIME = "20:00:00"; // fallback time of day if not set in Lighting service properties
Lighting.TimeOfDay = LIGHTING_TIME;
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

Players.LocalPlayer.SetAttribute("gameStarted", false);

// GAME INIT
const fplock = new FirstPersonLock();
fplock.start();

const crouchModule = new CrouchModule();
crouchModule.start();

const sprintModule = new SprintModule();
sprintModule.start();

const footstepsClient = new FootstepsClient();
footstepsClient.start();

const defaultSoundMuter = new DefaultSoundMuter();
defaultSoundMuter.start();

const hurtModule = new FallDamageModule();
hurtModule.start();

const ambientMusicModule = new AmbientMusicModule();
ambientMusicModule.start();

const brightnessAdjustModule = new BrightnessAdjustModule();
brightnessAdjustModule.start();

const readyHandler = new handleReady();
readyHandler.start();

print(sayStarted("main.client.ts"));
