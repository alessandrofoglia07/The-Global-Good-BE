import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {

    const params = {
        TableName: 'theGlobalGood-serverless-data',
        Key: {
            id: await event?.queryStringParameters?.id
        }
    };

    const command = new GetCommand(params);
    const result = await docClient.send(command);

    return {
        statusCode: 200,
        body: JSON.stringify(result.Item),
    };
};