export const polkassemblySchemaPost = {
    proposalType: {optional: false, isString: true},
    postId: {optional: false, isInt: true},
}

export const polkassemblySchemaPostByAddress = {
    proposerAddress: {optional: false, isString: true},
}

export const polkassemblySchemaPostsList = {
    proposalType: {optional: false, isString: true},
    trackStatus: {optional: false, isString: true},
    trackNo: {optional: true, isInt: {
        options: { min: 0, max:1},
    }},
    page: {optional: false, isInt: {
        options: { min: 1},
        errorMessage: 'Page must be an integer at least 1'
    }},
    listingLimit: {optional: false, isInt: {
        options: { min: 1},
        errorMessage: 'Limit must be an integer at least 1'
    }},
    sortBy: {optional: false, isString: true}
}