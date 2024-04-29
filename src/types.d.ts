type Collection = 'clothing-accessories' | 'home-living' | 'beauty-wellness' | 'food-beverages';

export interface Product {
    collection: Collection; // partition key
    name: string; // sort key
    description: string;
    img: string;
    price: number;
    countryOfOrigin: string;
    materials: string[];
    availability: number;
}

export interface Review {
    productName: string; // partition key (foreign key)
    reviewId: string; // sort key
    username: string; // (foreign key)
    rating: number;
    reviewTitle: string;
    reviewText: string;
    timestamp: number;
}