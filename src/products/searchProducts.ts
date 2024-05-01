import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { type Handler, type APIGatewayProxyEvent } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// request format: /products/search?q=t-shirt
export const handler: Handler = async (event: APIGatewayProxyEvent) => {

    const { q } = event.queryStringParameters || {};

    if (!q) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing search query',
            })
        };
    }

    const params: ScanCommandInput = {
        TableName: process.env.DYNAMODB_PRODUCTS_TABLE_NAME,
        FilterExpression: "contains(#name, :q)",
        ExpressionAttributeNames: {
            "#name": "name"
        },
        ExpressionAttributeValues: {
            ':q': q.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        }
    };

    try {
        const { Items } = await docClient.send(new ScanCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                products: Items,
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
            })
        };
    }
};