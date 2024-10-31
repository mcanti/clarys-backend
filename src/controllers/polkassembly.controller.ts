import { Response } from "express";
import { inject } from "inversify";
import {
  BaseHttpController,
  controller,
  httpPost,
  httpGet,
  response,
  queryParam,
} from "inversify-express-utils";

import { PolkassemblyService } from "../services/polkassembly.service";
import {
  polkassemblySchemaPost,
  polkassemblySchemaPostByAddress,
  polkassemblySchemaPostsList,
} from "../schemas/polkassembly.schema";
import { AwsStorageService } from "../services/awsStorage.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";
import { validateSchema } from "../middleware/validator.middleware";

import { FileService } from "../services/file.service";
import { findGoogleDocsLinks } from "../helpers/googleDocsLinksFinder.helper";

@controller("/api/polkassembly")
export class PolkassemblyController extends BaseHttpController {
  private readonly filePath: string;

  constructor(
    @inject("PolkassemblyService")
    private polkassemblyService: PolkassemblyService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("FileService") private fileService: FileService
  ) {
    super();
  }

  async _findOnChainPost(proposalType: string, postId: number) {
    try {
      const folder = `OnChainPost/${proposalType}`;
      const folderDocs = `OnChainPost/${proposalType}/docs`;
      const response = await this.polkassemblyService.OnChainPost({
        proposalType,
        postId,
      });

      const links = findGoogleDocsLinks(response.content);
      
      const bufferDocLinks = Buffer.from(JSON.stringify({documents: links}));

      await this.awsStorageService.uploadFilesToS3(
        bufferDocLinks,
        `${folderDocs}/#${postId}-docs.json`,
        "application/json"
      );
      
      const buffer = Buffer.from(JSON.stringify(response));

      const result = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/#${postId}.json`,
        "application/json"
      );

      return result;
    } catch (err) {
      console.log("Error - _findOnChainPost: ", err);
      throw Error("_findOnChainPost failed");
    }
  }

  async _findPostByAddress(proposerAddress: string) {
    try {
      const folder = "PostByAddress";
      const response = await this.polkassemblyService.PostByAddress({
        proposerAddress,
      });

      const buffer = Buffer.from(JSON.stringify(response));

      const result = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/${proposerAddress}.json`,
        "application/json"
      );

      return result;
    } catch (err) {
      console.log("Error - _findPostByAddress: ", err);
      throw Error("_findPostByAddress failed");
    }
  }

  async _findOnChainPosts(
    proposalType: string,
    trackStatus: string,
    sortBy: string,
    trackNo?: number
  ) {
    try {
      
      const folder = `OnChainPosts/${proposalType}/filtered`;
      const response = await this.polkassemblyService.ListOnChainPosts({
        proposalType,
        trackStatus,
        trackNo,
        page: 1,
        listingLimit: 1,
        sortBy,
      });

  
      const limit = 100;
      let allPosts = [];
  
      if (response?.count) {
        const totalPages = Math.ceil(response.count / limit);
  
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
          const responseBatch = await this.polkassemblyService.ListOnChainPosts({
            proposalType,
            trackStatus,
            sortBy,
            page: pageNumber,
            listingLimit: limit,
            trackNo,
          });
  
          if (responseBatch.posts && responseBatch.posts.length) {
            allPosts = [...allPosts, ...responseBatch.posts];
          }
        }
      }


      const filteredPosts: { title: string, type: string }[]=[]

      allPosts.forEach((post)=>{
        if((post.topic.name !=="General" && post.topic.name !=="Democracy" && post.type!=="CouncilMotion" && post.type!=="TechCommitteeProposal" && post.tags == undefined) || (post.topic.name !=="General" && post.type!=="CouncilMotion" && post.type!=="TechCommitteeProposal"  && post.topic.name !=="Democracy" && post.tags.length === 0) ){
          filteredPosts.push({title: post.title, type: post.type})
        }
      })

      const buffer = Buffer.from(
        JSON.stringify({ count: filteredPosts.length, posts: filteredPosts })
      );
  
      const uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/${proposalType}-${trackStatus}-List${
          trackNo ? `-TrackNo_#${trackNo}` : ""
        }.json`,
        "application/json"
      );
  
      // const buffer = Buffer.from(
      //   JSON.stringify({ count: response.count, posts: allPosts })
      // );
  
      // const uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
      //   buffer,
      //   `${folder}/${proposalType}-${trackStatus}-List${
      //     trackNo ? `-TrackNo_#${trackNo}` : ""
      //   }.json`,
      //   "application/json"
      // );
      
      return uploadedFileToS3;  ;

    } catch (err) {
      console.log("Error - _findOnChainPosts: ", err);
      throw Error('_findOnChainPosts failed')
    }
  }

  async _findAllOpenGovPosts(govType?: string) {
    try {
      const folder = `OpenGovPosts`;
      const response = await this.polkassemblyService.AllOpenGovPosts({
        govType: govType ? govType : "open_gov",
      });

      const buffer = Buffer.from(JSON.stringify(response));

      const result = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/${govType ? govType : "open_gov"}.json`,
        "application/json"
      );

      return result;
    } catch (err) {
      console.log("Error - _findAllOpenGovPosts: ", err);
      throw Error("_findAllOpenGovPosts failed");
    }
  }

  // Exposing API endpoints

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
  @httpGet("/findOnChainPost", validateSchema(polkassemblySchemaPost))
  async findOnChainPost(
    @response() res: Response,
    @queryParam("proposalType") proposalType: string,
    @queryParam("postId") postId: number
  ) {
    try {
      const result = await this._findOnChainPost(proposalType, postId);
      
      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findOnChainPost: ", err);
      res.apiError(ResponseWrapperCode.generalError);
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
  @httpGet(
    "/findPostByAddress",
    validateSchema(polkassemblySchemaPostByAddress)
  )
  async findPostByAddress(
    @response() res: Response,
    @queryParam("proposerAddress") proposerAddress: string
  ) {
    try {
      const result = await this._findPostByAddress(proposerAddress);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findPostByAddress: ", err);
      res.apiError(ResponseWrapperCode.generalError);
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
  @httpGet("/findOnChainPosts", validateSchema(polkassemblySchemaPostsList))
  async findOnChainPosts(
    @response() res: Response,
    @queryParam("proposalType") proposalType: string,
    @queryParam("trackStatus") trackStatus: string,
    @queryParam("sortBy") sortBy: string,
    @queryParam("trackNo") trackNo?: number
  ) {
    try {
      const result = await this._findOnChainPosts(
        proposalType,
        trackStatus,
        sortBy,
        trackNo
      );

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findOnChainPosts: ", err);
      res.apiError(ResponseWrapperCode.generalError);
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
  @httpGet("/findAllOpenGovPosts")
  async findAllOpenGovPosts(
    @response() res: Response,
    @queryParam("govType") govType?: string
  ) {
    try {
      const result = await this._findAllOpenGovPosts(govType);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findAllOpenGovPosts: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
