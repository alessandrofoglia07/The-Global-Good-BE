import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, DeleteCommandInput } from "@aws-sdk/lib-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    clientId: process.env.POOL_CLIENT_ID,
    tokenUse: 'access'
});

// request format: /blog/admin/delete?productName=PRODUCT_NAME&createdAt=CREATED_AT
export const handler: Handler = async (event: APIGatewayProxyEvent) => {

    let auth;

    // User must be authenticated and belong to the 'admin-users' group 
    try {
        if (!event.headers) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
        let token = event.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            token = event.headers.Authorization?.replace('Bearer ', '');
        }
        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
        auth = await cognitoJwtVerifier.verify(token);
        if (!auth['cognito:groups'] || !auth['cognito:groups'].includes('admin-users')) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    message: 'Unauthorized'
                })
            };
        }
    } catch (err) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                message: 'Unauthorized'
            })
        };
    }

    const { queryStringParameters } = event;
    if (!queryStringParameters || !queryStringParameters.productName || !queryStringParameters.createdAt) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Bad request'
            })
        };
    }
    const { productName, createdAt } = queryStringParameters;

    const params: DeleteCommandInput = {
        TableName: process.env.DYNAMODB_BLOGPOSTS_TABLE_NAME,
        Key: {
            productName,
            createdAt: parseInt(createdAt)
        }
    };

    try {
        await docClient.send(new DeleteCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Blog post deleted'
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};