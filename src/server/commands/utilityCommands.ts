import { Command, CommandContext, Group, Register, CenturionType } from "@rbxts/centurion";
import { getFanStatus } from "server/enviroment/fanStatus";
import { ReplicatedStorage } from "@rbxts/services";

function getOrCreateIntValue(name: string): IntValue {
	const existing = ReplicatedStorage.FindFirstChild(name) as IntValue | undefined;
	if (existing) return existing;
	const iv = new Instance("IntValue");
	iv.Name = name;
	iv.Value = 0;
	iv.Parent = ReplicatedStorage;
	return iv;
}

const scrapAmount = getOrCreateIntValue("ScrapAmount");
const vitaminAmount = getOrCreateIntValue("VitaminAmount");

@Register({
	groups: [
		{ name: "set", description: "Set game properties" },
		{ name: "speed", description: "Set player speed", parent: ["set"] },
		{ name: "give", description: "Give resources" },
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

	@Command({
		name: "scrap",
		description: "Give yourself scrap",
		arguments: [
			{
				name: "amount",
				description: "Amount of scrap to add",
				type: CenturionType.String,
			},
		],
	})
	@Group("give")
	giveScrap(ctx: CommandContext, amount: string) {
		const value = tonumber(amount);
		if (!value || value <= 0) {
			ctx.error("Invalid amount");
			return;
		}
		scrapAmount.Value += value;
		ctx.reply(`Gave ${value} scrap (total: ${scrapAmount.Value})`);
	}

	@Command({
		name: "adr",
		description: "Give yourself adrenaline",
		arguments: [
			{
				name: "amount",
				description: "Amount of adrenaline to add",
				type: CenturionType.String,
			},
		],
	})
	@Group("give")
	giveAdr(ctx: CommandContext, amount: string) {
		const value = tonumber(amount);
		if (!value || value <= 0) {
			ctx.error("Invalid amount");
			return;
		}
		vitaminAmount.Value += value;
		ctx.reply(`Gave ${value} adrenaline (total: ${vitaminAmount.Value})`);
	}

	@Command({
		name: "kill",
		description: "Kill yourself",
	})
	kill(ctx: CommandContext) {
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
		humanoid.Health = 0;
		ctx.reply("Killed");
	}

	@Command({
		name: "revive",
		description: "Revive yourself",
	})
	revive(ctx: CommandContext) {
		const player = ctx.executor as Player;
		player.LoadCharacter();
		player.SetAttribute("_dead", false);
		ctx.reply("Revived");
	}
}
