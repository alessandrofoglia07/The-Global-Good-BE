import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { BlogPost, Comment } from '../../types';
import { v4 as uuid } from 'uuid';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import z from 'zod';

const client = new DynamoDBClient({ region: "us-west-1" });
const docClient = DynamoDBDocumentClient.from(client);
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

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

    const { theme } = event.pathParameters || {};
    const createdAt = parseInt(event.pathParameters?.createdAt || '');
    const { text } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};

    if (!theme || !createdAt || !text) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required fields.' }),
        };
    }

    const schema = z.string().min(3, 'Comment must contain at least 3 characters').max(500, 'Comment must not exceed 500 characters');

    const val = schema.safeParse(text);
    if (!val.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: val.error.errors[0]?.message || 'Invalid comment.' }),
        };
    }

    const getParams: GetCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Key: { theme, createdAt }
    };

    try {
        const { Item } = (await docClient.send(new GetCommand(getParams))) as { Item?: BlogPost; };
        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Post not found.' }),
            };
        }

        const newComment: Comment = {
            commentId: uuid(),
            createdAt: Date.now(),
            content: text,
            username: auth.username,
            blogTheme: Item.theme,
            blogCreatedAt: Item.createdAt
        };

        const newBlogPost = {
            ...Item,
            comments: [...Item.comments, newComment.commentId + '#' + newComment.createdAt]
        };

        const putCommentParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_BLOGPOSTCOMMENTS_TABLE_NAME,
            Item: newComment
        };

        const putBlogPostParams: PutCommandInput = {
            TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
            Item: newBlogPost
        };

        await docClient.send(new PutCommand(putCommentParams));
        await docClient.send(new PutCommand(putBlogPostParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Comment added successfully.' }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};