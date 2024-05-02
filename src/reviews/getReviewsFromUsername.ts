import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// request format: /reviews/username?username=USERNAME&limit=LIMIT
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const username = event.queryStringParameters?.username;
    const limit = event.queryStringParameters?.limit || '5';

    if (!username) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Missing required parameters',
            })
        };
    }

    const params: QueryCommandInput = {
        TableName: process.env.DYNAMODB_REVIEWS_TABLE_NAME,
        IndexName: 'username-createdAt-index',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
            ':username': username,
        },
        ScanIndexForward: false, // sort by createdAt in descending order
        Limit: parseInt(limit)
    };

    try {
        const { Items } = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({
                reviews: Items,
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal Server Error',
            })
        };
    }
};