import { Command, CommandContext, Group, Register, CenturionType } from "@rbxts/centurion";
import { getPowerOutageController } from "server/events/powerOutage";

const EVENT_NAMES = ["poweroutage"];

@Register({
	groups: [
		{ name: "event", description: "Event control commands" },
	],
})
export class EventCommands {
	@Command({
		name: "start",
		description: "Start an event immediately",
		arguments: [
			{
				name: "event",
				description: "The event to start",
				type: CenturionType.String,
				suggestions: EVENT_NAMES,
			},
		],
	})
	@Group("event")
	startEvent(ctx: CommandContext, eventName: string) {
		if (eventName === "poweroutage") {
			getPowerOutageController().startEvent();
			ctx.reply("Power outage event started!");
		} else {
			ctx.error(`Unknown event: ${eventName}. Available: ${EVENT_NAMES.join(", ")}`);
		}
	}

	@Command({
		name: "end",
		description: "End an event immediately",
		arguments: [
			{
				name: "event",
				description: "The event to end",
				type: CenturionType.String,
				suggestions: EVENT_NAMES,
			},
		],
	})
	@Group("event")
	endEvent(ctx: CommandContext, eventName: string) {
		if (eventName === "poweroutage") {
			getPowerOutageController().endEvent();
			ctx.reply("Power outage event ended!");
		} else {
			ctx.error(`Unknown event: ${eventName}. Available: ${EVENT_NAMES.join(", ")}`);
		}
	}

	@Command({
		name: "help",
		description: "Lists all available commands",
	})
	help(ctx: CommandContext) {
		const commands = [
			"event start <event>  — Start an event (poweroutage)",
			"event end <event>    — End an event (poweroutage)",
			"order <productId>    — Order any item for free",
			"spawnitem <productId>  — Spawn an item at your position",
			"fullbright           — Toggle fullbright mode",
		];
		ctx.reply("Available commands:\n" + commands.join("\n"));
	}
}
