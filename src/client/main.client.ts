import { sayStarted } from "shared/startupMessages";
import { ContentProvider, Lighting, Players } from "@rbxts/services";
import Remotes from "shared/remotes";

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
import { InteractWithFan } from "./enviroment/interactWithFan";
import { PickupClient } from "./movement/pickup";
import { HighlightRemover } from "./enviroment/highlightRemover";
import { OldShopHandler } from "./menu/handleShopOld";
import { LightningEffectsAttacker } from "./attackereffects/lightningEffectsAttacker";
import { AttackerSoundMuffler } from "./sounds/attackerSoundMuffler";
import { StreetLightsFlickerer } from "./enviroment/streetlightsllickering";
import { AttackerController } from "./attacker/attackerController";

const LIGHTING_TIME = "20:00:00";
Lighting.TimeOfDay = LIGHTING_TIME;
Lighting.Brightness = 0;
const depthOfField = Lighting.WaitForChild("DepthOfField") as DepthOfFieldEffect;
depthOfField.Enabled = true;

Players.LocalPlayer.SetAttribute("gameStarted", false);

// GAME INIT

const attackerController = new AttackerController();
attackerController.start();


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

const interactWithFan = new InteractWithFan();
interactWithFan.start();

const pickupClient = new PickupClient();
pickupClient.start();

const highlightRemover = new HighlightRemover();
highlightRemover.start();

const oldShopHandler = new OldShopHandler();
oldShopHandler.start(); 

const lightningEffectsAttacker = new LightningEffectsAttacker();
lightningEffectsAttacker.start();

const attackerSoundMuffler = new AttackerSoundMuffler();
attackerSoundMuffler.start();

const streetLightsFlickerer = new StreetLightsFlickerer();
streetLightsFlickerer.start();


print(sayStarted("main.client.ts"));

