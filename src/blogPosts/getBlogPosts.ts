import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, ScanCommandInput, QueryCommandInput, GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// request format: /blog/admin/new?theme=PRODUCT_NAME&createdAt=CREATED_AT&productCollection=PRODUCT_COLLECTION&fullPost=false
export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    const { queryStringParameters } = event;

    const { theme, createdAt, productCollection, fullPost } = queryStringParameters || {};

    const fullPostBool = fullPost !== undefined ? fullPost !== 'false' : true;

    // If createdAt is provided, theme must also be provided
    if (!theme && createdAt) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'If createdAt is provided, theme must also be provided'
            })
        };
    }

    try {
        // if no query parameters are provided, return all blog posts
        if (!theme) {
            // get all blog posts (Scan)
            const params: ScanCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                Limit: 16,
                ProjectionExpression: fullPostBool ? undefined : 'theme, createdAt, productCollection, title, content.introduction, img, likes'
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

        // if theme and createdAt are provided, return a specific blog post
        if (theme && createdAt) {
            // get a specific blog post (GetItem)
            const params: GetCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                Key: {
                    theme,
                    createdAt: parseInt(createdAt)
                },
                ProjectionExpression: fullPostBool ? undefined : 'theme, createdAt, productCollection, title, content.introduction, img, likes'
            };
            const { Item } = await docClient.send(new GetCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify(Item)
            };
        }

        // if theme is provided, return all blog posts with the same theme
        if (theme) {
            // get all blog posts with the same theme (Query)
            const params: QueryCommandInput = {
                TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
                KeyConditionExpression: 'theme = :theme',
                ExpressionAttributeValues: {
                    ':theme': theme
                },
                ProjectionExpression: fullPostBool ? undefined : 'theme, createdAt, productCollection, title, content.introduction, img, likes'
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