// DeliveryOptions.ts
export namespace DeliveryOptions {
    export const Methods = [
        "Van"
    ] as const;

    export const Products = [
        { id: "templateBox", name: "Small Box", weight: 1 }
    ] as const;
}