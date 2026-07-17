import { Command, CommandContext, Group, Register, CenturionType } from "@rbxts/centurion";
import { getFanStatus } from "server/enviroment/fanStatus";

@Register({
	groups: [
		{ name: "set", description: "Set game properties" },
		{ name: "speed", description: "Set player speed", parent: ["set"] },
	],
})
export class UtilityCommands {
	@Command({
		name: "walk",
		description: "Set your walk speed",
		arguments: [
			{
				name: "value",
				description: "The walk speed value",
				type: CenturionType.String,
			},
		],
	})
	@Group("set", "speed")
	setWalkSpeed(ctx: CommandContext, value: string) {
		const speed = tonumber(value);
		if (!speed || speed <= 0) {
			ctx.error("Invalid speed value");
			return;
		}

		const player = ctx.executor as Player;
		const char = player.Character;
		if (!char) {
			ctx.error("No character found");
			return;
		}
		const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
		if (!humanoid) {
			ctx.error("No humanoid found");
			return;
		}

		humanoid.WalkSpeed = speed;
		ctx.reply(`Walk speed set to ${speed}`);
	}

	@Command({
		name: "sprint",
		description: "Set your sprint speed",
		arguments: [
			{
				name: "value",
				description: "The sprint speed value",
				type: CenturionType.String,
			},
		],
	})
	@Group("set", "speed")
	setSprintSpeed(ctx: CommandContext, value: string) {
		const speed = tonumber(value);
		if (!speed || speed <= 0) {
			ctx.error("Invalid speed value");
			return;
		}

		const player = ctx.executor as Player;
		const char = player.Character;
		if (!char) {
			ctx.error("No character found");
			return;
		}
		const humanoid = char.FindFirstChildOfClass("Humanoid") as Humanoid | undefined;
		if (!humanoid) {
			ctx.error("No humanoid found");
			return;
		}

		humanoid.WalkSpeed = speed;
		ctx.reply(`Sprint speed set to ${speed}`);
	}

	@Command({
		name: "resetfan",
		description: "Reset the fan cooldown",
	})
	resetFan(ctx: CommandContext) {
		getFanStatus().resetCooldown();
		ctx.reply("Fan cooldown reset");
	}
}
