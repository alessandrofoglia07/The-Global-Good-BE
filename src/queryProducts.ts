import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, type ScanCommandInput, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { type Handler, type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

/* API Gateway Request Parameters:
    {
        "queryStringParameters": {
            "collection": "clothing-accessories",
            "maxPrice": "100",
            "availability": "true",
            "countries": "Mexico,Brazil,India"
        }
    }
*/
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { queryStringParameters } = event;

    try {
        // Define the parameters for the scan operation
        const params: ScanCommandInput | QueryCommandInput = {
            TableName: 'TheGlobalGood-Products'
        };

        // If no query string parameters are provided, return all products
        if (!queryStringParameters || (!queryStringParameters.collection && !queryStringParameters.maxPrice && !queryStringParameters.availability && !queryStringParameters.countries)) {
            const { Items } = await docClient.send(new ScanCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    products: Items
                })
            };
        }

        const collection = queryStringParameters.collection; // 'clothing-accessories' | 'home-living' | 'beauty-wellness' | 'food-beverages'
        const maxPrice = queryStringParameters.maxPrice; // number
        const availability = queryStringParameters.availability; // boolean
        const countries = queryStringParameters.countries; // 'Mexico,Brazil,India'

        const filterExpression: string[] = [];
        const expressionAttributeValues = {};

        if (maxPrice && !isNaN(Number(maxPrice))) {
            filterExpression.push('price <= :maxPrice');
            expressionAttributeValues[':maxPrice'] = Number(maxPrice);
        }

        if (availability === 'true') {
            filterExpression.push('availability > :availability');
            expressionAttributeValues[':availability'] = 0;
        }

        if (countries) {
            const countriesArr = countries.split(',');
            if (countriesArr.length > 0) {
                const countriesExpression = countriesArr.map((_, i) => `:country${i}`).join(',');
                filterExpression.push(`countryOfOrigin IN (${countriesExpression})`);
                countriesArr.forEach((country, i) => {
                    expressionAttributeValues[`:country${i}`] = country;
                });
            }
        }

        params.FilterExpression = filterExpression.join(' AND ') || undefined;
        params.ExpressionAttributeValues = Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : undefined;

        if (collection) {
            (params as QueryCommandInput).KeyConditionExpression = '#collection = :collection';
            (params as QueryCommandInput).ExpressionAttributeNames = { '#collection': 'collection' };
            (params as QueryCommandInput).ExpressionAttributeValues = { ...params.ExpressionAttributeValues, ':collection': collection };

            const { Items } = await docClient.send(new QueryCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    products: Items
                })
            };
        } else {
            const { Items } = await docClient.send(new ScanCommand(params));
            return {
                statusCode: 200,
                body: JSON.stringify({
                    products: Items
                })
            };
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }

};