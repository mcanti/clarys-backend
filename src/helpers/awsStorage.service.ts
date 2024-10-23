
import { injectable } from 'inversify';
import { GetObjectCommand, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage';
import { Config } from '../config/config'
import { Stream } from 'stream';

@injectable()
export class AwsStorageService {
    private readonly s3: S3Client;
    private readonly s3Buket: string;
    private readonly ttl: number;

    constructor() {
        this.s3Buket = new Config().getConfig().s3;
        this.s3 = new S3Client({region: new Config().getConfig().region});
        this.ttl = 3600;
    }

    async uploadFilesToS3(
        buffer: Buffer,
        key: string,
        type: string = 'application/json'
    ): Promise<PutObjectCommandOutput>{
        const readable = new Stream.PassThrough();
        readable.end(buffer);

        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: this.s3Buket,
                Key: key,
                Body: readable,
                ContentType: type
            }
        });

        return await upload.done();
    }

    async getFile(
        key: string,
    ){
        try {
            const getObjectCommand = new GetObjectCommand({
                Bucket: this.s3Buket,
                Key: key
            });

            return await this.s3.send(getObjectCommand);

        } catch(err){
            console.log('Error - getFile: ', err);
            throw err;
        }
    }
}