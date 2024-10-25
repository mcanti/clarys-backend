export interface OnChainPostParamsInterface {
    proposalType: string,
    postId: number
}

export interface PostByAddressParamsInterface {
    proposerAddress: string,
}

export interface ListOnChainPostsParamsInterface {
    proposalType: string,
    trackStatus: string,
    trackNo: number,
    page: number,
    listingLimit: number,
    sortBy: string
}

export interface AllOpenGovPostsInterface {
    govType: string,
}