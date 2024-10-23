import {Response} from 'express';
import {inject} from 'inversify';
import { TYPES } from "../interfaces/types";
import {BaseHttpController, controller, httpPost, httpGet, response, queryParam} from "inversify-express-utils";

import {PolkassemblyService} from "../services/polkassembly.service";
import {polkassemblySchemaPost, polkassemblySchemaPostByAddress, polkassemblySchemaPostsList} from "../schemas/polkassembly.schema";
import {AwsStorageService} from "../helpers/awsStorage.service";
import {ResponseWrapperCode} from "../helpers/responseWrapper.service";
import {validateSchema} from "../middleware/validator.middleware";

@controller('/api/polkassembly')
export class PolkassemblyController extends BaseHttpController{

    constructor(
        @inject('PolkassemblyService') private polkassemblyService: PolkassemblyService,
        @inject('AwsStorageService') private awsStorageService: AwsStorageService,
    ){
        super();
    }


    @httpGet('/findOnChainPost',
        validateSchema(polkassemblySchemaPost)
    )
    async findOnChainPost(
        @response() res: Response,
        @queryParam('proposalType') proposalType: string,
        @queryParam('postId') postId: number,
    ){
        try {
            const response = await this.polkassemblyService.OnChainPost({proposalType, postId})

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findOnChainPost: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }


    @httpGet('/findPostByAddress',
        validateSchema(polkassemblySchemaPostByAddress)
    )
    async findPostByAddress(
        @response() res: Response,
        @queryParam('proposerAddress') proposerAddress: string,
    ){
        try {
            const response = await this.polkassemblyService.PostByAddress({proposerAddress})

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findPostByAddress: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }


    
    @httpGet('/findOnChainPosts',
        validateSchema(polkassemblySchemaPostsList)
    )
    async findOnChainPosts(
        @response() res: Response,
        @queryParam('proposalType') proposalType: string,
        @queryParam('trackStatus') trackStatus: string,
        @queryParam('page') page: number,
        @queryParam('listingLimit') listingLimit: number,
        @queryParam('sortBy') sortBy: string,
        @queryParam('trackNo') trackNo?: number,
    ){
        try {
            const response = await this.polkassemblyService.ListOnChainPosts({proposalType, trackStatus, trackNo, page, listingLimit, sortBy})

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findOnChainPosts: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }

}