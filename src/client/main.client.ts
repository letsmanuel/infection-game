import { sayStarted } from "shared/startupMessages";
import { ContentProvider, Lighting, Players } from "@rbxts/services";
import Remotes from "shared/remotes";
import { Centurion } from "@rbxts/centurion";
import { CenturionUI } from "@rbxts/centurion-ui";

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
import { GameStateClient } from "./gameState";
import { PowerOutageClient } from "./events/powerOutage";
import GiveHintHandler from "./gui/giveHint";
import "client/lootUI";
import "client/enviroment/vanRenderer";
import "client/commands/debugCommands";

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

print("street lights flickerer, go!")

const gameStateClient = new GameStateClient();
gameStateClient.start();

print("game state client go.")

const powerOutageClient = new PowerOutageClient();
powerOutageClient.start();

print("Power outage client go.")

const giveHintHandler = new GiveHintHandler();
giveHintHandler.start();

Centurion.client().start()
	.then(() => {
		CenturionUI.start(Centurion.client(), {
			activationKeys: [Enum.KeyCode.F2],
			hideOnLostFocus: false,
		});
		print("[Centurion] Client started");
	})
	.catch((err) => warn("Failed to start Centurion:", err));


print(sayStarted("main.client.ts"));

