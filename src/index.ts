import _ from 'lodash';

export const handler = async () => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Hello World from Lambda! ${_.now()}`,
        }),
    };
};