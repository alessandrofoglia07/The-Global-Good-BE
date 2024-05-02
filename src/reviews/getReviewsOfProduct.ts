import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Handler, APIGatewayProxyEvent } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Request format: /reviews/product?name=NAME&limit=LIMIT
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { queryStringParameters } = event;

    if (!queryStringParameters || !queryStringParameters.name || queryStringParameters.name.trim() === '') {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name is required'
            })
        };
    }

    const name = queryStringParameters.name;
    const limit = queryStringParameters.limit || '5';

    try {
        const params: QueryCommandInput = {
            TableName: process.env.DYNAMODB_REVIEWS_TABLE_NAME,
            KeyConditionExpression: 'productName = :name',
            ExpressionAttributeValues: {
                ':name': name
            },
            ScanIndexForward: false, // Sort by latest reviews
            Limit: parseInt(limit)
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify(Items)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};