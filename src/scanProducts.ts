import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);


export const handler = async () => {

    const params = {
        TableName: 'TheGlobalGood-Products'
    };

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    return {
        statusCode: 200,
        body: JSON.stringify(result.Items),
    };
};