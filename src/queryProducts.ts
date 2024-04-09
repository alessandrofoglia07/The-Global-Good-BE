import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

interface Filters {
    collection: string | null;
    maxPrice: number;
    availability: 'in-stock' | null;
    countries: string[];
}

const buildQuery = (filters: Filters) => {
    const queryParams: QueryCommandInput = {
        TableName: 'TheGlobalGood-Products',
        ExpressionAttributeValues: undefined,
        KeyConditionExpression: undefined
    };

    const keyConditionExpressions: string[] = [];
    const expressionAttributeValues: Record<string, Record<string, unknown>> = {};

    if (filters.collection) {
        keyConditionExpressions.push('collection = :collection');
        expressionAttributeValues[":collection"] = { S: filters.collection };
    }
    if (filters.maxPrice) {
        keyConditionExpressions.push('price <= :maxPrice');
        expressionAttributeValues[":maxPrice"] = { N: filters.maxPrice.toString() };
    }
    if (filters.availability) {
        keyConditionExpressions.push('availability = :availability');
        expressionAttributeValues[":availability"] = { S: filters.availability };
    }
    if (filters.countries.length) {
        keyConditionExpressions.push('countryOfOrigin IN (:countries)');
        expressionAttributeValues[":countries"] = { SS: filters.countries };
    }

    queryParams.KeyConditionExpression = keyConditionExpressions.length ? keyConditionExpressions.join(' AND ') : undefined;
    queryParams.ExpressionAttributeValues = Object.keys(expressionAttributeValues).length ? expressionAttributeValues : undefined;

    return queryParams;
};

// TODO: Fix this 
export const handler = async (event) => {
    let collection, maxPrice, availability, countryOfOrigin;

    if (JSON.parse(event).queryStringParameters) {
        collection = event.queryStringParameters.collection;
        maxPrice = event.queryStringParameters.maxPrice;
        availability = event.queryStringParameters.availability;
        countryOfOrigin = event.queryStringParameters.countryOfOrigin;
    }

    console.table({ collection, maxPrice, availability, countryOfOrigin, params: JSON.parse(event).queryStringParameters });

    try {
        const filters: Filters = {
            collection: collection || null,
            maxPrice: maxPrice ? parseInt(maxPrice) : 0,
            availability: availability || null,
            countries: countryOfOrigin ? countryOfOrigin.split(' ') : []
        };
        const queryParams = buildQuery(filters);
        const command = new QueryCommand(queryParams);
        const { Items } = await docClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Hello World',
                data: Items
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