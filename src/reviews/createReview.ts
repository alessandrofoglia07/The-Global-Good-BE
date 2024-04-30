import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { Handler, APIGatewayProxyEvent } from "aws-lambda";
import { z } from 'zod';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Review } from "../types";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: "us-west-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

// Request format: /product/{collection}/{name}/review
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { pathParameters, body } = event;

    let auth;

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
        console.error(err);
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }

    if (!pathParameters || !pathParameters.name || pathParameters.name.trim() === '' || !pathParameters.collection) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name and collection are required'
            })
        };
    }

    const { name } = pathParameters;

    if (!body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Review data is required'
            })
        };
    }

    try {
        const review = JSON.parse(body);

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
            username: auth.username,
            reviewId: uuidv4(),
            rating: review.rating,
            reviewTitle: review.reviewTitle,
            reviewText: review.reviewText,
            timestamp: Date.now()
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
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};