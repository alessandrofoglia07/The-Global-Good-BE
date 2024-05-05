import { Collection } from "./static/collections";

export type Collection = Collection;

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
    createdAt: number; // sort key
    productCollection: Collection; // (foreign key)
    reviewId: string;
    username: string; // (foreign key)
    rating: number;
    reviewTitle: string;
    reviewText: string;
}

export interface BlogPost {
    theme: string; // partition key (foreign key) 
    createdAt: number; // sort key 
    img: string;
    title: string;
    content: {
        custom: false;
        introduction: string;
        story: string;
        fairTradeImpact: string;
    } | {
        custom: true;
        paragraphs: { title: string; content: string; }[];
    };
    likes: string[]; // (foreign key)
    comments: {
        username: string; // (foreign key)
        createdAt: number;
        comment: string;
    }[];
    productCollection?: Collection; // foreign key
}