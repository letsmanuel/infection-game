// DeliveryOptions.ts
export namespace DeliveryOptions {
    export const Methods = [
        "Van"
    ] as const;

    export const Products = [
        { id: "templateBox", name: "Small Box", weight: 1, category: "Barricades" },
        { id: "BearTrap", name: "Rusty Bear Trap", weight: 5, category: "oldShop" },
        { id: "Landmine", name: "Landmine", weight: 7, category: "oldShop" },
        { id: "SpikyBush", name: "Rose Bush", weight: 3, category: "oldShop" },
        { id: "Spikes", name: "Spikes", weight: 10, category: "oldShop" },
        { id: "Tripwire", name: "Tripwire", weight: 10, category: "oldShop" },
    ] as const;

    export const CategoryLimits: Record<string, number> = {
        "oldShop": 2,
        "newShop": 5,
    };
}
