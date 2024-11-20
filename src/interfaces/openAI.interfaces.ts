export interface ListFilesParamsInterface {
    purpose?: string,
    limit?: number,
    order?: string,
    after?: string
}

export interface GetFileParamsInterface {
    file_id: string,
}

export interface GetFileContentParamsInterface {
    file_id: string,
}

export interface UploadFileBodyParamsInterface {
    purpose: string,
    file: File,
    filename: string
}

export interface DeleteFileParamsInterface {
    file_id: string,
}

export interface AddFileToVectorStoreBodyParamsInterface {
    file_id: string,
    chunking_strategy?: object
}

export interface AddFilesBatchToVectorStoreBodyParamsInterface {
    file_ids: string[]
}

export interface ListVectorStoreFilesParamsInterface {
    limit: number,
    order?: string,
    after?: string,
    before?: string,
    filter?: string
}

export interface DeleteVectorStoreFileParamsInterface{
    file_id: string,
}

