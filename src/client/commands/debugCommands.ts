import { Command, CommandContext, Register } from "@rbxts/centurion";
import { Lighting } from "@rbxts/services";
import { getFirstPersonLock } from "client/camera/firstPersonLock";

let fullbright = false;

const NORMAL_AMBIENT = new Color3(68 / 255, 68 / 255, 68 / 255);
const FULLBRIGHT_AMBIENT = new Color3(1, 1, 1);

@Register()
export class DebugCommands {
	@Command({
		name: "fullbright",
		description: "Toggles fullbright mode for testing",
	})
	fullbright(ctx: CommandContext) {
		fullbright = !fullbright;

		if (fullbright) {
			Lighting.Ambient = FULLBRIGHT_AMBIENT;
			Lighting.Brightness = 3;
			Lighting.EnvironmentDiffuseScale = 0;
			Lighting.EnvironmentSpecularScale = 0;
			Lighting.OutdoorAmbient = FULLBRIGHT_AMBIENT;
			ctx.reply("Fullbright ENABLED");
		} else {
			Lighting.Ambient = NORMAL_AMBIENT;
			Lighting.Brightness = 0;
			Lighting.EnvironmentDiffuseScale = 1;
			Lighting.EnvironmentSpecularScale = 1;
			Lighting.OutdoorAmbient = new Color3(0, 0, 0);
			ctx.reply("Fullbright DISABLED (restored normal lighting)");
		}
	}

	@Command({
		name: "freecam",
		description: "Toggle free camera mode",
	})
	freecam(ctx: CommandContext) {
		getFirstPersonLock().toggleFreecam();
		ctx.reply("Freecam toggled");
	}
}
