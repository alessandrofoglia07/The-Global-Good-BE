declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DYNAMODB_PRODUCTS_TABLE_NAME: string;
        }
    }
}

export { };