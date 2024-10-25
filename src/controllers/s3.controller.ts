import { Request, Response } from 'express';
import { inject } from 'inversify';
import { BaseHttpController, controller, httpGet,httpPost, request,requestBody, requestParam, queryParam, response } from "inversify-express-utils";

import { AwsStorageService } from "../helpers/awsStorage.service";
import { ResponseWrapperCode } from "../helpers/responseWrapper.service";

@controller('/api/s3')
export class S3Controller extends BaseHttpController {

    constructor(
        @inject('AwsStorageService') private awsStorageService: AwsStorageService,
    ) {
        super();
    }

    /**
     * @swagger
     * /api/s3/s3UploadFiles:
     *   post:
     *     summary: Upload files to S3
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               buffer:
     *                 type: string
     *                 format: binary
     *                 description: The file buffer to upload
     *               key:
     *                 type: string
     *                 description: The key under which to store the file in S3
     *               type:
     *                 type: string
     *                 description: The MIME type of the file
     *     responses:
     *       200:
     *         description: Successfully uploaded the file
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *       400:
     *         description: Invalid input
     *       500:
     *         description: Internal server error
     */
    @httpPost('/s3UploadFiles')
    async s3UploadFiles(
        @request() req: Request,
        @response() res: Response,
        @requestBody() params: {
            buffer: Buffer,
            key: string,
            type: string
        }
    ) {
        try {
            const uploadResponse = await this.awsStorageService.uploadFilesToS3(params.buffer, params.key, params.type);

            return res.apiSuccess({
                message: 'File successfully uploaded to S3',
                data: uploadResponse
            });
        } catch (err) {
            console.error("Error - s3UploadFiles: ", err);

            const ErrorResponse = ResponseWrapperCode.generalError;
            ErrorResponse.message =`Failed to upload file to S3: ${err.message}`;
            return res.apiError(ErrorResponse);
        }
    }

    /**
     * @swagger
     * /api/s3/s3GetFile/{key}:
     *   get:
     *     summary: Get a file from S3
     *     parameters:
     *       - name: key
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *         description: The key of the file to retrieve from S3
     *     responses:
     *       200:
     *         description: Successfully retrieved the file
     *         content:
     *           application/octet-stream:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: File not found
     *       500:
     *         description: Internal server error
     */
    @httpGet('/s3GetFile')
    async s3GetFile(
        @response() res: Response,
        @queryParam('key') key: string
    ) {
        try {
    
            const file = await this.awsStorageService.getFile(key);

            if (!file.Body) {
                const ErrorResponse = ResponseWrapperCode.missingItem;
                ErrorResponse.message =`File with key ${key} not found in S3`;
                return res.apiError(ErrorResponse);
            }

            res.setHeader('Content-Type', file.ContentType || 'application/json');
            res.setHeader('Content-Length', file.ContentLength || 0);
            file.Body.pipe(res);
        } catch (err) {
            console.error("Error - getFileFromS3: ", err);

            const ErrorResponse = ResponseWrapperCode.generalError;
            ErrorResponse.message = `Failed to retrieve file from S3: ${err.message}`;
            return res.apiError(ErrorResponse);
        }
    }

    /**
     * @swagger
     * /api/s3/deleteS3File:
     *   get:
     *     summary: Get a file from S3
     *     parameters:
     *       - name: key
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *         description: The key of the file to retrieve from S3
     *     responses:
     *       200:
     *         description: Successfully retrieved the file
     *         content:
     *           application/octet-stream:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: File not found
     *       500:
     *         description: Internal server error
     */
    @httpGet('/deleteS3File')
    async deleteS3File(
        @response() res: Response,
        @queryParam('key') key: string
    ) {
        try {
            const response = await this.awsStorageService.deleteFile(key);

            res.apiSuccess(response)
        } catch (err) {
            console.error("Error - deleteS3File: ", err);

            const ErrorResponse = ResponseWrapperCode.generalError;
            ErrorResponse.message = `Failed to delete file from S3: ${err.message}`;
            return res.apiError(ErrorResponse);
        }
    }
}
