import { Command, CommandContext, Register, CenturionType } from "@rbxts/centurion";
import { getOrderHandler } from "server/orderHandler";
import { DeliveryOptions } from "shared/configs/deliveryOptions";

const PRODUCT_IDS = DeliveryOptions.Products.map((p) => p.id) as string[];

@Register()
export class OrderCommands {
	@Command({
		name: "order",
		description: "Order any item instantly for free (bypasses scrap cost and rate limits)",
		arguments: [
			{
				name: "productId",
				description: "The product ID to order",
				type: CenturionType.String,
				suggestions: PRODUCT_IDS,
			},
		],
	})
	order(ctx: CommandContext, productId: string) {
		const player = ctx.executor as Player;

		if (!PRODUCT_IDS.includes(productId)) {
			ctx.error(`Invalid product ID. Available: ${PRODUCT_IDS.join(", ")}`);
			return;
		}

		getOrderHandler().placeFreeOrder(player, productId);
		ctx.reply(`Ordered "${productId}" for free. Delivery incoming!`);
	}

	@Command({
		name: "spawnitem",
		description: "Spawn any item directly at your position (skips delivery van)",
		arguments: [
			{
				name: "productId",
				description: "The product ID to spawn",
				type: CenturionType.String,
				suggestions: PRODUCT_IDS,
			},
		],
	})
	spawnitem(ctx: CommandContext, productId: string) {
		const player = ctx.executor as Player;

		if (!PRODUCT_IDS.includes(productId)) {
			ctx.error(`Invalid product ID. Available: ${PRODUCT_IDS.join(", ")}`);
			return;
		}

		getOrderHandler().spawnItem(player, productId);
		ctx.reply(`Spawned "${productId}" in front of you!`);
	}
}
