export const collections = [
    'clothing-accessories',
    'home-living',
    'beauty-wellness',
    'food-beverages'
] as const;

export type Collection = typeof collections[number];