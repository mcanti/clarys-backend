import { injectable } from 'inversify';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { Config } from '../config/config';
import { Stream } from 'stream';
import https from 'https';
import * as process from "process";


@injectable()
export class AwsStorageService {
    private readonly s3: S3Client;
    private readonly s3Bucket: string;
    private readonly ttl: number;

    constructor() {
        const config = new Config().getConfig();
        this.s3Bucket = config.s3;
        this.s3 = new S3Client({ region: config.region ,  credentials:{
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
        }, 
        requestHandler: new NodeHttpHandler({
            httpAgent : new https.Agent({
                rejectUnauthorized: false // Ignore SSL certificate errors
            })
        })
        
    });
        this.ttl = 3600;
    }

    async uploadFilesToS3(
        buffer: Buffer,
        key: string,
        type: string = 'application/json'
    ): Promise<PutObjectCommandOutput> {
        const readable = new Stream.PassThrough();
        readable.end(buffer);

        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: this.s3Bucket,
                Key: key,
                Body: readable,
                ContentType: type
            }
        });

        return await upload.done();
    }

    async getFile(key: string): Promise<any> {
        console.log("TEst");
        
        try {
            const getObjectCommand = new GetObjectCommand({
                Bucket: this.s3Bucket,
                Key: key
            });

            return await this.s3.send(getObjectCommand);
        } catch (err) {
            console.error('Error in getFile: ', err); 
            throw new Error(`Unable to retrieve file with key ${key}: ${err.message}`);
        }
    }

    async deleteFile(key: string): Promise<any> {
        try {
            const deleteObjectCommand = new DeleteObjectCommand({
                Bucket: this.s3Bucket,
                Key: key
            });

            return await this.s3.send(deleteObjectCommand);
        } catch (err) {
            console.error('Error in deleteFile: ', err); 
            throw new Error(`Unable to retrieve file with key ${key}: ${err.message}`);
        }
    }
}
