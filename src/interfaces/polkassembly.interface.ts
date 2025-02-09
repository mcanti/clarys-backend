export interface OnChainPostParamsInterface {
    proposalType: string,
    postId: number
}

export interface PostByAddressParamsInterface {
    proposerAddress: string,
}

export interface ListOnChainPostsParamsInterface {
    proposalType: string,
    trackStatus?: string,
    trackNo?: number,
    page: number,
    listingLimit: number,
    sortBy: string
}

export interface AllOpenGovPostsInterface {
    govType: string,
}

export interface ListOffChainPostsParamsInterface {
    proposalType: string,
    page: number,
    listingLimit: number,
}

export interface OffChainPostParamsInterface {
    proposalType: string,
    postId: number
}