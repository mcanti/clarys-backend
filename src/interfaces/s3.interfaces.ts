export interface ListOnChainPostsResponseInterface {
    count: number,
    posts: object[]
}

export interface s3File {
    Key: string,
    LastModified?: Date,
    ETag?: string,
    Size?: number
    StorageClass?: string
}