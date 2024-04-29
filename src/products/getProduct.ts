import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput } from '@aws-sdk/lib-dynamodb';
import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Request format: /product/{collection}/{name}
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { pathParameters } = event;

    if (!pathParameters || !pathParameters.name || pathParameters.name.trim() === '' || !pathParameters.collection) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name and collection are required'
            })
        };
    }

    const collection = pathParameters.collection;
    const name = pathParameters.name;

    try {
        const params: GetCommandInput = {
            TableName: process.env.DYNAMODB_PRODUCTS_TABLE_NAME,
            Key: {
                collection,
                name
            }
        };

        const { Item } = await docClient.send(new GetCommand(params));

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Product not found'
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                product: Item
            })
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};