export const handler = async (event) => {
    const newScopes = event.request.groupConfiguration.groupsToOverride.map(item => `${item}-${event.callerContext.clientId}`);

    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: {
                scopes: newScopes.join(' ')
            }
        }
    };

    return event;
};