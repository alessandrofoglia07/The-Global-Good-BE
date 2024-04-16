import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Request format: /product/{name}
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { pathParameters } = event;

    if (!pathParameters || !pathParameters.name) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Product name is required'
            })
        };
    }

    const name = pathParameters.name;

    try {
        const params: QueryCommandInput = {
            TableName: process.env.DYNAMODB_PRODUCTS_TABLE_NAME,
            IndexName: "name-index",
            KeyConditionExpression: "#name = :name",
            ExpressionAttributeNames: {
                "#name": "name"
            },
            ExpressionAttributeValues: {
                ":name": name
            }
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        if (!Items || Items.length === 0) {
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
                product: Items[0]
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