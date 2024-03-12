export const handler = async () => {
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from User Lambda!')
    };

    return response;
};