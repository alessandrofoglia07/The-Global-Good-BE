import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Handler, APIGatewayProxyEvent } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Request format: /product/{collection}/{name}/reviews
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { pathParameters } = event;

    if (!pathParameters || !pathParameters.name || pathParameters.name.trim() === '' || !pathParameters.collection) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name and collection are required'
            })
        };
    }

    const name = pathParameters.name;

    try {
        const params: QueryCommandInput = {
            TableName: process.env.DYNAMODB_REVIEWS_TABLE_NAME,
            KeyConditionExpression: 'productName = :name',
            ExpressionAttributeValues: {
                ':name': name
            }
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Items)
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