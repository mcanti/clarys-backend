export const polkassemblySchemaPost = {
    proposalType: {
        in: ['query'],
        exists: {
            errorMessage: 'proposalType is required',
        },
        isString: true,
        trim: true,
    },
    postId: {
        in: ['query'],
        exists: {
            errorMessage: 'postId is required',
        },
        isInt: {
            errorMessage: 'postId must be an integer',
        },
        toInt: true,
    },
}

export const polkassemblySchemaPostByAddress = {
    proposerAddress: {
        in: ['query'],
        exists: {
            errorMessage: 'proposerAddress is required',
        },
        isString: {
            errorMessage: 'proposerAddress must be a string',
        },
        trim: true,
    },
}

export const polkassemblySchemaPostsList = {
    proposalType: {
        in: ['query'],
        exists: {
            errorMessage: 'proposalType is required',
        },
        isString: {
            errorMessage: 'proposalType must be a string',
        },
        trim: true,
    },
    trackStatus: {
        in: ['query'],
        exists: {
            errorMessage: 'trackStatus is required',
        },
        isString: {
            errorMessage: 'trackStatus must be a string',
        },
        trim: true,
    },
    trackNo: {
        in: ['query'],
        optional: { options: { nullable: true } },
        isInt: {
            errorMessage: 'trackNo must be an integer',
            options: { min: 0, max: 1 },
        },
        toInt: true,
    },
    sortBy: {
        in: ['query'],
        exists: {
            errorMessage: 'sortBy is required',
        },
        isString: {
            errorMessage: 'sortBy must be a string',
        },
        trim: true,
    },
}

export const polkassemblySchemaOffChainPost = {
    proposalType: {
        in: ['query'],
        exists: {
            errorMessage: 'proposalType is required',
        },
        isString: true,
        trim: true,
    },
    postId: {
        in: ['query'],
        exists: {
            errorMessage: 'postId is required',
        },
        isInt: {
            errorMessage: 'postId must be an integer',
        },
        toInt: true,
    },
}

export const polkassemblySchemaOffChainPostsList = {
    proposalType: {
        in: ['query'],
        exists: {
            errorMessage: 'proposalType is required',
        },
        isString: {
            errorMessage: 'proposalType must be a string',
        },
        trim: true,
    },
}
