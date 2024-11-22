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
  polkassemblySchemaOffChainPost,
  polkassemblySchemaOffChainPostsList,
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
import { findGoogleDriveDocsLinks } from "../helpers/googleDriveDocsLinksFinder.helper";

import {
  CategoriesList,
  CategoriesAndTags,
  CategoriesForKeyword,
} from "../constants/postCategories";
import { S3Controller } from "./s3.controller";
import { containsSubstring } from "../helpers/categories.helper";

@controller("/api/polkassembly")
export class PolkassemblyController extends BaseHttpController {
  private readonly filePath: string;

  //config inject awsStorageService or fileService
  constructor(
    @inject("PolkassemblyService")
    private polkassemblyService: PolkassemblyService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("FileService") private fileService: FileService,
    @inject("S3Controller") private s3Controller: S3Controller,
    @inject("GoogleServices") private googleService: GoogleServices
  ) {
    super();
  }

  //OnChain

  async _findOnChainPost(proposalType: string, postId: number) {
    try {
      const folder = `OnChainPost/${proposalType}/${postId}`;
      const folderDocs = `OnChainPost/${proposalType}/${postId}/docs`;
      const response = await this.polkassemblyService.OnChainPost({
        proposalType,
        postId,
      });

      let googleDocsLinks = [];
      let googleDriveLinks = [];

      if (response?.content) {
        googleDocsLinks = findGoogleDocsLinks(response.content);
        googleDriveLinks = findGoogleDriveDocsLinks(response.content);
      }

      const filesIds = [];
      googleDocsLinks.forEach((googleDocUrl) => {
        const fieldId = findFiledId(googleDocUrl);
        if (!fieldId) {
          console.log("Invalid Google Docs URL provided.");
        } else {
          filesIds.push(fieldId);
        }
      });

      if (filesIds.length) {
        await Promise.all(
          filesIds.map(async (fileId) => {
            await this.googleService.uploadGoogleDocToS3(fileId, folderDocs);
          })
        );
      }

      if (response?.comments) {
        delete response.comments;
      }

      if (response?.post_reactions) {
        delete response.post_reactions;
      }

      if (response?.proposed_call) {
        delete response.proposed_call;
      }

      if (response?.profile) {
        delete response.profile;
      }

      const buffer = Buffer.from(JSON.stringify(response));

      const result = await this.awsStorageService.uploadFilesToS3(
        buffer,
        `${folder}/#${postId}.json`,
        "application/json"
      );

      // await this.fileService.saveDataToFile(`${folder}/#${postId}.json`,response);

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
      const fileName = `${proposalType}-List.json`;
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
            responseBatch.posts.forEach((post) => {
              if (post?.post_reactions) {
                delete post.post_reactions;
              }
              if (post?.content) {
                delete post.content;
              }
              if (post?.comments_count) {
                delete post.comments_count;
              }
              if (post?.proposalHashBlock) {
                delete post.proposalHashBlock;
              }
              if (post?.spam_users_count) {
                delete post.spam_users_count;
              }
              if (post?.track_no) {
                delete post.track_no;
              }
            });
            allPosts = [...allPosts, ...responseBatch.posts];
          }
        }
      }

      const postsWithCategories = [];

      allPosts.forEach((post) => {
        let categories: string[] = [];

        if (post?.tags && post.tags.length > 0) {
          post.tags.forEach((tag) => {
            CategoriesAndTags.forEach((categoryAndTags) => {
              if (categoryAndTags.tags.includes(tag)) {
                categories.push(categoryAndTags.category);
              }
            });
          });
        }

        if (
          post?.topic &&
          post.topic?.name &&
          CategoriesList.includes(post.topic.name)
        ) {
          categories.push(post.topic.name);
        }

        if (post?.type && CategoriesList.includes(post.type)) {
          categories.push(post.type);
        }

        if (post?.title) {
          CategoriesForKeyword.forEach((categoryForKeyword) => {
            if (containsSubstring(post.title, categoryForKeyword.keyword)) {
              categories = [...categories, ...categoryForKeyword.categories];
            }
          });
        }

        postsWithCategories.push({
          ...post,
          categories: categories,
        });
      });

      const storedList = await this.s3Controller._s3GetFile(
        `${folder}/${fileName}`
      );

      let buffer;
      let uploadedFileToS3;
      const modifiedPostsIds = [];

      if (
        storedList === null ||
        typeof storedList === "string" ||
        (storedList &&
          storedList?.count &&
          storedList.count !== postsWithCategories.length)
      ) {
        buffer = Buffer.from(
          JSON.stringify({
            modifiedPostsIds: [],
            count: postsWithCategories.length,
            posts: postsWithCategories,
          })
        );

        uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
          buffer,
          `${folder}/${proposalType}-List.json`,
          "application/json"
        );

        await this.fileService.saveDataToFile(`${proposalType}-List.json`, {
          modifiedPostsIds: [],
          count: postsWithCategories.length,
          posts: postsWithCategories,
        });
      } else {
        if (storedList?.posts) {
          storedList.posts.forEach((post) => {
            postsWithCategories.forEach((newPost) => {
              if (
                newPost?.post_id &&
                post?.post_id &&
                newPost?.status_history &&
                post?.status_history &&
                newPost.post_id === post.post_id
              ) {
                if (
                  newPost.status_history.length > post.status_history.length ||
                  (newPost.status_history.length ===
                    post.status_history.length &&
                    newPost.status_history[newPost.status_history.length - 1]
                      .status !==
                      post.status_history[post.status_history.length - 1]
                        .status)
                ) {
                  modifiedPostsIds.push(newPost.post_id);
                }
              }
            });
          });
          if (modifiedPostsIds.length > 0) {
            buffer = Buffer.from(
              JSON.stringify({
                modifiedPostsIds: modifiedPostsIds,
                count: postsWithCategories.length,
                posts: postsWithCategories,
              })
            );

            uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
              buffer,
              `${folder}/${proposalType}-List.json`,
              "application/json"
            );

            await this.fileService.saveDataToFile(`${proposalType}-List.json`, {
              modifiedPostsIds: modifiedPostsIds,
              count: postsWithCategories.length,
              posts: postsWithCategories,
            });
          }
        }
      }

      return {
        uploadFileToS3: uploadedFileToS3 != undefined ? true : false,
        s3Response: uploadedFileToS3 != undefined ? uploadedFileToS3 : null,
        data: {
          modifiedPostsIds: modifiedPostsIds,
          count: postsWithCategories.length,
          posts: postsWithCategories,
        },
      };
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

  //OffChain

  async _findOffChainPost(proposalType: string, postId: number) {
    try {
      const folder = `OffChainPost/${proposalType}/${postId}`;
      const folderDocs = `OffChainPost/${proposalType}/${postId}/docs`;
      const response = await this.polkassemblyService.OffChainPost({
        proposalType,
        postId,
      });

      const googleDocsLinks = findGoogleDocsLinks(response.content);

      const filesIds = [];
      googleDocsLinks.forEach((googleDocUrl) => {
        const fieldId = findFiledId(googleDocUrl);
        if (!fieldId) {
          console.log("Invalid Google Docs URL provided.");
        } else {
          filesIds.push(fieldId);
        }
      });

      if (filesIds.length) {
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
      console.log("Error - _findOffChainPost: ", err);
      throw Error("_findOffChainPost failed");
    }
  }

  async _findOffChainPosts(proposalType: string) {
    try {
      const folder = `OffChainPosts/${proposalType}`;
      const fileName = `${proposalType}-List.json`;
      const response = await this.polkassemblyService.ListOffChainPosts({
        proposalType,
        page: 1,
        listingLimit: 1,
      });

      const limit = 100;
      let allPosts = [];

      if (response?.count) {
        const totalPages = Math.ceil(response.count / limit);

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
          const responseBatch =
            await this.polkassemblyService.ListOffChainPosts({
              proposalType,
              page: pageNumber,
              listingLimit: limit,
            });

          if (responseBatch.posts && responseBatch.posts.length) {
            responseBatch.posts.forEach((post) => {
              if (post?.post_reactions) {
                delete post.post_reactions;
              }
            });

            allPosts = [...allPosts, ...responseBatch.posts];
          }
        }
      }

      const postsWithCategories = [];

      allPosts.forEach((post) => {
        let categories: string[] = [];

        if (post?.tags && post.tags.length > 0) {
          post.tags.forEach((tag) => {
            CategoriesAndTags.forEach((categoryAndTags) => {
              if (categoryAndTags.tags.includes(tag)) {
                categories.push(categoryAndTags.category);
              }
            });
          });
        }

        if (
          post?.topic &&
          post.topic?.name &&
          CategoriesList.includes(post.topic.name)
        ) {
          categories.push(post.topic.name);
        }

        if (post?.type && CategoriesList.includes(post.type)) {
          categories.push(post.type);
        }

        if (post?.title) {
          CategoriesForKeyword.forEach((categoryForKeyword) => {
            if (containsSubstring(post.title, categoryForKeyword.keyword)) {
              categories = [...categories, ...categoryForKeyword.categories];
            }
          });
        }

        postsWithCategories.push({
          ...post,
          categories: [...categories, "Discussions"],
        });
      });

      const storedList = await this.s3Controller._s3GetFile(
        `${folder}/${fileName}`
      );

      let buffer;
      let uploadedFileToS3;
      const modifiedPostsIds = [];

      if (
        storedList === null ||
        typeof storedList === "string" ||
        (storedList &&
          storedList?.count &&
          storedList.count !== postsWithCategories.length)
      ) {
        buffer = Buffer.from(
          JSON.stringify({
            modifiedPostsIds: [],
            count: postsWithCategories.length,
            posts: postsWithCategories,
          })
        );

        uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
          buffer,
          `${folder}/${proposalType}-List.json`,
          "application/json"
        );

        await this.fileService.saveDataToFile(
          `${folder}/${proposalType}-List.json`,
          {
            modifiedPostsIds: [],
            count: postsWithCategories.length,
            posts: postsWithCategories,
          }
        );
      }

      return {
        uploadFileToS3: uploadedFileToS3 != undefined ? true : false,
        s3Response: uploadedFileToS3 != undefined ? uploadedFileToS3 : null,
        data: {
          modifiedPostsIds: modifiedPostsIds,
          count: postsWithCategories.length,
          posts: postsWithCategories,
        },
      };
    } catch (err) {
      console.log("Error - _findOnChainPosts: ", err);
      throw Error("_findOnChainPosts failed");
    }
  }

  // Exposing API endpoints

  //OnChain

  /**
   * @swagger
   * /api/polkassembly/findOnChainPost:
   *   get:
   *     tags:
   *       - Polkassembly
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
   *     tags:
   *       - Polkassembly
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
   *     tags:
   *       - Polkassembly
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
   *     tags:
   *       - Polkassembly
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

  //OffChain

  /**
   * @swagger
   * /api/polkassembly/findOffChainPost:
   *   get:
   *     tags:
   *       - Polkassembly
   *     summary: Find an off-chain post by ID
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
  @httpGet("/findOffChainPost", validateSchema(polkassemblySchemaOffChainPost))
  async findOffChainPost(
    @response() res: Response,
    @queryParam("proposalType") proposalType: string,
    @queryParam("postId") postId: number
  ) {
    try {
      const result = await this._findOffChainPost(proposalType, postId);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findOffChainPost: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }

  /**
   * @swagger
   * /api/polkassembly/findOffChainPosts:
   *   get:
   *     tags:
   *       - Polkassembly
   *     summary: List off-chain posts
   *     parameters:
   *       - name: proposalType
   *         in: query
   *         required: true
   *         description: The type of the proposal
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
    "/findOffChainPosts",
    validateSchema(polkassemblySchemaOffChainPostsList)
  )
  async findOffChainPosts(
    @response() res: Response,
    @queryParam("proposalType") proposalType: string
  ) {
    try {
      const result = await this._findOffChainPosts(proposalType);

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findOffChainPosts: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
