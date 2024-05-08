import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchGetCommand, BatchGetCommandInput, GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { BlogPost } from '../../types';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { theme } = event.pathParameters || {};
    const createdAt = parseInt(event.pathParameters?.createdAt || '');
    const { limit } = event.queryStringParameters || {};

    if (!theme || !createdAt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required fields.' }),
        };
    }

    const getParams: GetCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Key: {
            theme,
            createdAt
        }
    };

    try {
        const { Item } = await docClient.send(new GetCommand(getParams)) as { Item?: BlogPost; };

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Post not found.' }),
            };
        }

        if (!Item.comments || Item.comments.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify([]),
            };
        }

        const batchGetParams: BatchGetCommandInput = {
            RequestItems: {
                [process.env.DYNAMODB_BLOGPOSTCOMMENTS_TABLE_NAME]: {
                    Keys: (Item.comments.length > 99 ? Item.comments.slice(-((limit && parseInt(limit) < 99 && parseInt(limit) > 1) ? limit : 15), -1) : Item.comments).map((comment) => ({ commentId: comment.split('#')[0], createdAt: parseInt(comment.split('#')[1]!) })),
                    ProjectionExpression: 'content, createdAt, username'
                }
            }
        };

        const { Responses } = await docClient.send(new BatchGetCommand(batchGetParams));

        return {
            statusCode: 200,
            body: JSON.stringify(Responses ? Responses[process.env.DYNAMODB_BLOGPOSTCOMMENTS_TABLE_NAME] : [])
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' }),
        };
    }
};