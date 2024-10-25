import {Response} from 'express';
import {inject} from 'inversify';
import {BaseHttpController, controller, httpPost, httpGet, response, queryParam} from "inversify-express-utils";

import {PolkassemblyService} from "../services/polkassembly.service";
import {polkassemblySchemaPost, polkassemblySchemaPostByAddress, polkassemblySchemaPostsList} from "../schemas/polkassembly.schema";
import {AwsStorageService} from "../helpers/awsStorage.service";
import {ResponseWrapperCode} from "../helpers/responseWrapper.service";
import {validateSchema} from "../middleware/validator.middleware";

import {FileService} from "../services/file.service";

@controller('/api/polkassembly')
export class PolkassemblyController extends BaseHttpController{
    private readonly filePath: string;

    constructor(
        @inject('PolkassemblyService') private polkassemblyService: PolkassemblyService,
        @inject('AwsStorageService') private awsStorageService: AwsStorageService,
        @inject('FileService') private fileService: FileService,
    ){
        super();
    }

    /**
     * @swagger
     * /api/polkassembly/findOnChainPost:
     *   get:
     *     summary: Find an on-chain post by ID
     *     parameters:
     *       - name: proposalType
     *         in: query
     *         required: true
     *         description: The type of the proposal
     *         schema:
     *           type: string
     *       - name: postId
     *         in: query
     *         required: true
     *         description: The ID of the post
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Successfully retrieved the post
     *       400:
     *         description: Invalid input
     *       500:
     *         description: Internal server error
     */
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

            await this.fileService.saveDataToFile(`${proposalType}-#${postId}`, response);
   
            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findOnChainPost: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }

    /**
     * @swagger
     * /api/polkassembly/findPostByAddress:
     *   get:
     *     summary: Find posts by proposer address
     *     parameters:
     *       - name: proposerAddress
     *         in: query
     *         required: true
     *         description: The address of the proposer
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Successfully retrieved the posts
     *       400:
     *         description: Invalid input
     *       500:
     *         description: Internal server error
     */
    @httpGet('/findPostByAddress',
        validateSchema(polkassemblySchemaPostByAddress)
    )
    async findPostByAddress(
        @response() res: Response,
        @queryParam('proposerAddress') proposerAddress: string,
    ){
        try {
            const response = await this.polkassemblyService.PostByAddress({proposerAddress})

            await this.fileService.saveDataToFile(`${proposerAddress}`, response);

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findPostByAddress: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }


    /**
     * @swagger
     * /api/polkassembly/findOnChainPosts:
     *   get:
     *     summary: List on-chain posts
     *     parameters:
     *       - name: proposalType
     *         in: query
     *         required: true
     *         description: The type of the proposal
     *         schema:
     *           type: string
     *       - name: trackStatus
     *         in: query
     *         required: true
     *         description: The status of the track
     *         schema:
     *           type: string
     *       - name: page
     *         in: query
     *         required: true
     *         description: The page number for pagination
     *         schema:
     *           type: integer
     *       - name: listingLimit
     *         in: query
     *         required: true
     *         description: The limit of posts per page
     *         schema:
     *           type: integer
     *       - name: sortBy
     *         in: query
     *         required: false
     *         description: The field to sort by
     *         schema:
     *           type: string
     *       - name: trackNo
     *         in: query
     *         required: false
     *         description: Optional track number
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Successfully retrieved the posts
     *       400:
     *         description: Invalid input
     *       500:
     *         description: Internal server error
     */
    @httpGet('/findOnChainPosts',
        validateSchema(polkassemblySchemaPostsList)
    )
    async findOnChainPosts(
        @response() res: Response,
        @queryParam('proposalType') proposalType: string,
        @queryParam('trackStatus') trackStatus: string,
        @queryParam('sortBy') sortBy: string,
        @queryParam('trackNo') trackNo?: number,
    ){        
        try {
            const response = await this.polkassemblyService.ListOnChainPosts({proposalType, trackStatus, trackNo, page:1, listingLimit:1, sortBy})
            const limit = 100;

            if(response?.count){

                const totalPages = Math.ceil(response.count / limit);
                let allPosts = [];
                
                for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
                    const responseBatch = await this.polkassemblyService.ListOnChainPosts({proposalType, trackStatus, sortBy, page: pageNumber, listingLimit:limit, trackNo})
                    if(responseBatch.posts && responseBatch.posts.length){
                        allPosts = [...allPosts, ...responseBatch.posts]
                    }
                }

                await this.fileService.saveDataToFile(`${proposalType}-${trackStatus}-List${trackNo? `-TrackNo_#${trackNo}`:''}`, {count: response.count, posts:allPosts});
            }

            
            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findOnChainPosts: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }

        
    /**
     * @swagger
     * /api/polkassembly/findAllOpenGovPosts:
     *   get:
     *     summary: Find All Open Gov Posts
     *     responses:
     *       200:
     *         description: Successfully retrieved the posts
     *       400:
     *         description: Invalid input
     *       500:
     *         description: Internal server error
     */
    @httpGet('/findAllOpenGovPosts')
    async findAllOpenGovPosts(
        @response() res: Response
    ){
        try {
            const response = await this.polkassemblyService.AllOpenGovPosts({govType: 'open_gov'})

            await this.fileService.saveDataToFile(`AllOpenGovPosts`, response);

            res.apiSuccess({
                ...response
            })

        } catch(err){
            console.log("Error - findAllOpenGovPosts: ", err);
            res.apiError(ResponseWrapperCode.generalError)
        }

    }

}