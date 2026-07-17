// DeliveryOptions.ts
export namespace DeliveryOptions {
    export const Methods = [
        "Van"
    ] as const;

    export const Products = [
        { id: "templateBox", name: "Small Box", weight: 1, category: "Barricades", scrapCost: 2 },
        { id: "BearTrap", name: "Rusty Bear Trap", weight: 5, category: "oldShop", scrapCost: 3 },
        { id: "Landmine", name: "Landmine", weight: 7, category: "oldShop", scrapCost: 5 },
        { id: "SpikyBush", name: "Rose Bush", weight: 3, category: "oldShop", scrapCost: 3 },
        { id: "Spikes", name: "Spikes", weight: 10, category: "oldShop", scrapCost: 2 },
        { id: "Tripwire", name: "Tripwire", weight: 10, category: "oldShop", scrapCost: 5 },
    ] as const;

    export const CategoryLimits: Record<string, number> = {
        "oldShop": 10,
        "newShop": 5,
    };
}
