import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { BlogPost } from '../types';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    let auth;

    // User must be authenticated and belong to the 'admin-users' group 
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
        if (!auth['cognito:groups'] || !auth['cognito:groups'].includes('admin-users')) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
    } catch (err) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }

    const { body } = event;

    if (!body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Request body is required'
            })
        };
    }

    const { productName, title, content, productCollection, img } = typeof body !== 'string' && body ? body : JSON.parse(body);

    if (!productName || productName.trim() === '' || !title || title.trim() === '' || !content || content.trim() === '' || !productCollection || productCollection.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name, title, content, and collection are required'
            })
        };
    }

    const newItem: BlogPost = {
        productName,
        createdAt: Date.now(),
        img: img || productName.toLowerCase().replace(/ /g, '-') + '.png',
        title,
        content,
        productCollection
    };

    const params: PutCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Item: newItem
    };

    try {
        await docClient.send(new PutCommand(params));

        return {
            statusCode: 201,
            body: JSON.stringify(newItem)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Unable to create blog post'
            })
        };
    }
};