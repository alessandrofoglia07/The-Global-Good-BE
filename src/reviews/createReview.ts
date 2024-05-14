import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { Handler, APIGatewayProxyEvent } from "aws-lambda";
import { z } from 'zod';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Collection, Review } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { collections } from "../static/collections";

const client = new DynamoDBClient({ region: "us-west-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

// Request format: /reviews/product?name=NAME&collection=COLLECTION
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { queryStringParameters, body } = event;

    let auth;

    // user needs to be authenticated to add a review
    try {
        if (!event.headers) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
        let token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            token = event.headers.Authorization?.replace('Bearer ', '');
        }
        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
        auth = await cognitoJwtVerifier.verify(token);
    } catch (err) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }

    if (!queryStringParameters || !queryStringParameters.name || queryStringParameters.name.trim() === '' || !queryStringParameters.collection || queryStringParameters.collection.trim() === '' || !collections.includes(queryStringParameters.collection as Collection)) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name and collection are required'
            })
        };
    }

    const { name } = queryStringParameters;

    if (!body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Review data is required'
            })
        };
    }

    try {
        const review = typeof body !== 'string' && body ? body : JSON.parse(body);

        const reviewSchema = z.object({
            rating: z.number().int().min(1).max(5),
            reviewTitle: z.string().min(1).max(50),
            reviewText: z.string().min(1).max(500)
        });

        const validate = reviewSchema.safeParse(review);

        if (!validate.success) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Invalid review data',
                    errors: validate.error.errors
                })
            };
        }

        const Item: Review = {
            productName: name,
            createdAt: Date.now(),
            productCollection: queryStringParameters.collection as Collection,
            username: auth.username,
            reviewId: uuidv4(),
            rating: review.rating,
            reviewTitle: review.reviewTitle,
            reviewText: review.reviewText
        };

        const command: PutCommandInput = {
            TableName: process.env.DYNAMODB_REVIEWS_TABLE_NAME,
            Item
        };

        await docClient.send(new PutCommand(command));

        return {
            statusCode: 201,
            body: JSON.stringify(Item)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                error: err
            })
        };
    }
};