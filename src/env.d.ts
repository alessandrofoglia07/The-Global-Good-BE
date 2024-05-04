declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DYNAMODB_PRODUCTS_TABLE_NAME: string;
            DYNAMODB_REVIEWS_TABLE_NAME: string;
            DYNAMODB_BLOGPOSTS_TABLE_NAME: string;
            USER_POOL_ID: string;
            POOL_CLIENT_ID: string;
        }
    }
}

export { };