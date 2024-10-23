import {Request, Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpPost, request, requestBody, response} from "inversify-express-utils";

import {AwsStorageService} from "../helpers/awsStorage.service";
import {ResponseWrapperCode} from "../helpers/responseWrapper.service";
import {validateSchema} from "../middleware/validator.middleware";
import {s3SchemaList} from "../schemas/s3.schema";

@controller('/api/s3')
export class S3Controller extends BaseHttpController{

    constructor(
        @inject('AwsStorageService') private awsStorageService: AwsStorageService,
    ){
        super()
    }

    

    @httpPost('/s3UploadFiles',
        validateSchema(s3SchemaList)
    )
    async s3UploadFiles(
        @request() req: Request,
        @response() res: Response,
        @requestBody() params: {
            buffer: Buffer,
            key: string,
            type: string
        }
    ){
        try {
            const response = await this.awsStorageService.uploadFilesToS3(params.buffer, params.key, params.type);

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - s3UploadFiles: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }



}