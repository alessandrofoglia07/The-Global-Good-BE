import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { BlogPost } from "../types";

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

// request format: /blog/{theme}/{createdAt}/like
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
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
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }

    const { username } = auth;

    if (!username) return {
        statusCode: 401,
        body: JSON.stringify({
            message: 'Unauthorized'
        })
    };

    const { theme, createdAt } = event.pathParameters || {};

    if (!theme || !createdAt) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Bad request'
            })
        };
    }

    const getParams: GetCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Key: {
            theme,
            createdAt: parseInt(createdAt)
        }
    };

    let blogPost: BlogPost;

    try {
        const { Item } = await docClient.send(new GetCommand(getParams));
        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Not found'
                })
            };
        }
        blogPost = Item as BlogPost;
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }

    if (blogPost.likes.includes(username)) {
        const list = blogPost.likes;
        const indexToRemove = list.indexOf(username);
        list.splice(indexToRemove, 1);
        const putParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
            Item: {
                ...blogPost,
                likes: list
            }
        };
        try {
            await docClient.send(new PutCommand(putParams));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Success'
                })
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
    }

    const params: PutCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Item: {
            ...blogPost,
            likes: [...blogPost.likes, username]
        }
    };

    try {
        await docClient.send(new PutCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Success'
            })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                error: err,
                params
            })
        };
    }
};