import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand, BatchGetCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Request format: /products?products=collection1:name1,collection2:name2,collection3:name3
export const handler: Handler = async (event: APIGatewayProxyEvent) => {

    const { queryStringParameters } = event;

    if (!queryStringParameters || !queryStringParameters.products) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Products query string parameter is required'
            })
        };
    }

    const products = queryStringParameters.products.split(',');

    const keysWithDuplicates = products.map((product) => {
        const [collection, name] = product.split(':');
        return { collection, name };
    });

    const keys = keysWithDuplicates.filter((key, index) => keysWithDuplicates.findIndex((k) => k.collection === key.collection && k.name === key.name) === index);

    const params: BatchGetCommandInput = {
        RequestItems: {
            [process.env.DYNAMODB_PRODUCTS_TABLE_NAME]: {
                Keys: keys,
                ProjectionExpression: '#collection, #name, price, img',
                ExpressionAttributeNames: {
                    '#collection': 'collection',
                    '#name': 'name'
                }
            }
        }
    };

    try {
        const res = await docClient.send(new BatchGetCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                products: res.Responses![process.env.DYNAMODB_PRODUCTS_TABLE_NAME]
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