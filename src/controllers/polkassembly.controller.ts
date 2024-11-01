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
import { GoogleServices } from "../services/google.services";
import {
  findFiledId,
  findGoogleDocsLinks,
} from "../helpers/googleDocsLinksFinder.helper";

import { CategoriesList } from "../constants/postCategories";
import { tagsCategories } from "../constants/tagsCategory";

@controller("/api/polkassembly")
export class PolkassemblyController extends BaseHttpController {
  private readonly filePath: string;

  constructor(
    @inject("PolkassemblyService")
    private polkassemblyService: PolkassemblyService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("GoogleServices") private googleService: GoogleServices,
    @inject("FileService") private fileService: FileService
  ) {
    super();
  }

  async _findOnChainPost(proposalType: string, postId: number) {
    try {
      const folder = `OnChainPost/${proposalType}/${postId}`;
      const folderDocs = `OnChainPost/${proposalType}/${postId}/docs`;
      const response = await this.polkassemblyService.OnChainPost({
        proposalType,
        postId,
      });

      const googleDocsLinks = findGoogleDocsLinks(response.content);
      console.log(response.content);
      
      console.log("googleDocsLinks", googleDocsLinks);
      

      const filesIds = [];
      googleDocsLinks.forEach((googleDocUrl) => {
        const fieldId = findFiledId(googleDocUrl);
        if (!fieldId) {
          console.log("Invalid Google Docs URL provided.");
        } else {
          filesIds.push(fieldId);
        }
      });

      if(filesIds.length){
        await Promise.all(
          filesIds.map(async (fileId) => {
            console.log("fileId: ", fileId);
            
            await this.googleService.uploadGoogleDocToS3(fileId, folderDocs);
          })
        );
      }
      
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
      const folder = `OnChainPosts/${proposalType}`;
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
          const responseBatch = await this.polkassemblyService.ListOnChainPosts(
            {
              proposalType,
              trackStatus,
              sortBy,
              page: pageNumber,
              listingLimit: limit,
              trackNo,
            }
          );

          if (responseBatch.posts && responseBatch.posts.length) {
            allPosts = [...allPosts, ...responseBatch.posts];
          }
        }
      }

      const postsWithCategories = [];

      allPosts.forEach((post) => {
        if (post?.tags && post.tags.length > 0) {
          const categories: string[] = [];
          post.tags.forEach((tag) => {
            CategoriesList.forEach((category) => {
              if (tagsCategories[category].includes(tag)) {
                categories.push(category);
              }
            });
          });
          postsWithCategories.push({
            ...post,
            categories: categories,
          });
        } else if (CategoriesList.includes(post.topic.name)) {
          postsWithCategories.push({
            ...post,
            categories: post.topic.name,
          });
        } else {
          postsWithCategories.push({
            ...post,
            categories: [],
          });
        }
      });

      const buffer = Buffer.from(
        JSON.stringify({
          count: postsWithCategories.length,
          posts: postsWithCategories,
        })
      );

      const uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/${proposalType}-List.json`,
        "application/json"
      );

      return uploadedFileToS3;
    } catch (err) {
      console.log("Error - _findOnChainPosts: ", err);
      throw Error("_findOnChainPosts failed");
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
