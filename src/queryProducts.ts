import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { type Handler, type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

// TODO: Fix this
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { queryStringParameters } = event;
    console.log('queryStringParameters:', queryStringParameters);

    try {
        const page = queryStringParameters?.page || 1;
        const pageSize = 2;

        const exclusiveStartKey = page === 1 ? undefined : {
            pageNum: Number(page) - 1,
        };

        // Define the parameters for the scan operation
        const params: ScanCommandInput = {
            TableName: 'TheGlobalGood-Products',
            Limit: pageSize,
            ExclusiveStartKey: exclusiveStartKey
        };

        // If no query string parameters are provided, return all products
        if (!queryStringParameters || (!queryStringParameters.collection && !queryStringParameters.maxPrice && !queryStringParameters.availability && !queryStringParameters.countries)) {
            console.log('No query parameters found, returning all products...');
            const { Items, LastEvaluatedKey } = await docClient.send(new ScanCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    products: Items,
                    nextPage: LastEvaluatedKey ? Number(page) + 1 : null
                })
            };
        }

        console.log('Query parameters found, filtering products...');

        const collection = queryStringParameters.collection; // string
        const maxPrice = queryStringParameters.maxPrice; // number
        const availability = queryStringParameters.availability; // boolean
        const countries = queryStringParameters.countries; // array of strings

        const filterExpression: string[] = [];
        const expressionAttributeValues = {};

        if (collection) {
            filterExpression.push('#collection = :collection');
            expressionAttributeValues[':collection'] = collection;
            params.ExpressionAttributeNames = { '#collection': 'collection' };
        }

        if (maxPrice) {
            filterExpression.push('price <= :maxPrice');
            expressionAttributeValues[':maxPrice'] = Number(maxPrice);
        }

        if (availability) {
            filterExpression.push('availability > :availability');
            expressionAttributeValues[':availability'] = 0;
        }

        if (countries) {
            filterExpression.push('contains(countries, :countries)');
            expressionAttributeValues[':countries'] = countries;
        }

        params.FilterExpression = filterExpression.join(' AND ') || undefined;
        params.ExpressionAttributeValues = Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined;
        console.log('params:', params);

        const { Items, LastEvaluatedKey } = await docClient.send(new ScanCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                products: Items,
                nextPage: LastEvaluatedKey ? Number(page) + 1 : null
            })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }

};