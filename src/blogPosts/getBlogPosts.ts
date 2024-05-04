import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, ScanCommandInput, QueryCommandInput, GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// request format: /blog/admin/new?productName=PRODUCT_NAME&createdAt=CREATED_AT&productCollection=PRODUCT_COLLECTION
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { queryStringParameters } = event;

    const { productName, createdAt, productCollection } = queryStringParameters || {};

    // If createdAt is provided, productName must also be provided
    if (!productName && createdAt) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'If createdAt is provided, productName must also be provided'
            })
        };
    }

    try {
        // if no query parameters are provided, return all blog posts
        if (!productName) {
            console.log('Getting all blog posts...');
            // get all blog posts (Scan)
            const params: ScanCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                Limit: 16
            };
            if (productCollection) {
                params.FilterExpression = 'productCollection = :productCollection';
                params.ExpressionAttributeValues = {
                    ':productCollection': productCollection
                };
            }
            const { Items } = await docClient.send(new ScanCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify(Items)
            };
        }

        // if productName and createdAt are provided, return a specific blog post
        if (productName && createdAt) {
            console.log(`Getting blog post with productName: ${productName} and createdAt: ${createdAt}...`);
            // get a specific blog post (GetItem)
            const params: GetCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                Key: {
                    productName,
                    createdAt: parseInt(createdAt)
                }
            };
            const { Item } = await docClient.send(new GetCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify(Item)
            };
        }

        // if productName is provided, return all blog posts with the same productName
        if (productName) {
            console.log(`Getting blog posts with productName: ${productName}...`);
            // get all blog posts with the same productName (Query)
            const params: QueryCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                KeyConditionExpression: 'productName = :productName',
                ExpressionAttributeValues: {
                    ':productName': productName
                }
            };
            if (productCollection) {
                params.FilterExpression = 'productCollection = :productCollection';
                params.ExpressionAttributeValues = {
                    ...params.ExpressionAttributeValues,
                    ':productCollection': productCollection
                };
            }
            const { Items } = await docClient.send(new QueryCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify(Items)
            };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid query parameters'
            })
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