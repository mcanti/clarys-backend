import { Request, Response } from "express";
import { inject } from "inversify";
import {
  BaseHttpController,
  controller,
  httpGet,
  httpPost,
  request,
  requestBody,
  requestParam,
  queryParam,
  response,
} from "inversify-express-utils";
import { Readable } from "stream";

import { AwsDynamoDBService } from "../services/awsDynamoDB.service";
import { AwsStorageService } from "../services/awsStorage.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

import {
  PostsTypes,
  proposalTypes,
  proposalSubType,
} from "../constants/dynamoDbTypes";
import { eventsTypeList, proposalTypeList } from "../constants/proposalTypes";

import { streamToString } from "../helpers/streamToStringHelper";
import { findGoogleDocsLinks } from "../helpers/googleDocsLinksFinder.helper";
import { findGoogleDriveDocsLinks } from "../helpers/googleDriveDocsLinksFinder.helper";

@controller("/api/dynamoDB")
export class DynamoDBController extends BaseHttpController {
  constructor(
    @inject("AwsDynamoDBService")
    private awsDynamoDBService: AwsDynamoDBService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService
  ) {
    super();
  }

  async _createDynamoDBTable(tableName: string) {
    try {
      const createDynamoDBTableResponse =
        await this.awsDynamoDBService.createDynamoDBTableIfNotExists(tableName);

      return createDynamoDBTableResponse;
    } catch (err) {
      console.error("Error - _createDynamoDBTable: ", err);
      return null;
    }
  }

  async _addDataToDynamoDBTable() {
    try {
      const dataAddedToTables = [];

      for (const postsType of PostsTypes) {
        const folderPaths = await this.awsStorageService.listFilesAndFolders(
          "folders",
          `${postsType}/`
        );

        const tableNames = folderPaths.map((path) =>
          path.replace(`${postsType}/`, "").replace("/", "")
        );

        await Promise.all(
          tableNames.map(async (tableName) => {
            const isEventsTable = tableName === "events";
            const data = { tableName, addedData: [] };
            const eventTypes = isEventsTable ? eventsTypeList : [tableName];

            for (const eventType of eventTypes) {
              const fileKey = `${postsType}/${tableName}/${eventType}-List.json`;
              const response = await this.awsStorageService.getFile(fileKey);

              if (!response || !response?.Body) {
                console.warn(`File not found: ${fileKey}`);
                continue;
              }

              const jsonData = await streamToString(response.Body as Readable);
              const parsedData = JSON.parse(jsonData);
              if (!parsedData.posts) continue;

              const addedItems = await Promise.all(
                parsedData.posts.map(async (post, index) => {
                  const postId =
                    post.post_id?.toString() ||
                    post.id?.toString() ||
                    `index-${index}`;
                  let jsonPostKey;

                  if (postsType === "OnChainPosts") {
                    jsonPostKey = `OnChainPost/${tableName}/${postId}/#${postId}.json`;
                  } else if (postsType === "OffChainPosts") {
                    if (isEventsTable) {
                      jsonPostKey = `OffChainPost/${tableName}/${eventType}/${postId}/#${postId}.json`;
                    } else {
                      jsonPostKey = `OffChainPost/${tableName}/${postId}/#${postId}.json`;
                    }
                  }

                  let jsonPost = null;
                  const docsLinks = [];

                  const jsonPostResponse = await this.awsStorageService.getFile(
                    jsonPostKey
                  );

                  if (!jsonPostResponse || !response?.Body) {
                    console.warn(`File not found: ${jsonPostKey}`);
                  } else {
                    const jsonPostData = await streamToString(
                      jsonPostResponse.Body as Readable
                    );
                    jsonPost = JSON.parse(jsonPostData);

                    const docsLinks = [];
                    if (jsonPost?.content) {
                      const googleDocsLinks = findGoogleDocsLinks(
                        jsonPost.content
                      );
                      const googleDriveLinks = findGoogleDriveDocsLinks(
                        jsonPost.content
                      );
                      docsLinks.push(...googleDocsLinks);
                      docsLinks.push(...googleDriveLinks);
                    }
                    if (
                      jsonPost?.proposalFolderlLink ||
                      jsonPost?.reportFolderLink
                    ) {
                      if (Array.isArray(typeof jsonPost.proposalFolderlLink)) {
                        docsLinks.push(...jsonPost.proposalFolderlLink);
                      } else {
                        docsLinks.push(jsonPost.proposalFolderlLink);
                      }
                      if (Array.isArray(typeof jsonPost.reportFolderLink)) {
                        docsLinks.push(...jsonPost.reportFolderLink);
                      } else {
                        docsLinks.push(jsonPost.reportFolderLink);
                      }
                    }
                    if (jsonPost?.column_values?.google_doc__1?.url) {
                      if (
                        Array.isArray(jsonPost.column_values.google_doc__1.url)
                      ) {
                        docsLinks.push(
                          ...jsonPost.column_values.google_doc__1.url
                        );
                      } else {
                        docsLinks.push(
                          jsonPost.column_values.google_doc__1.url
                        );
                      }
                    }
                    if (jsonPost?.column_values?.link__1?.url) {
                      if (Array.isArray(jsonPost.column_values.link__1.url)) {
                        docsLinks.push(...jsonPost.column_values.link__1.url);
                      } else {
                        docsLinks.push(jsonPost.column_values.link__1.url);
                      }
                    }
                  }

                  const creationDate =
                    post.timeline?.[0]?.created_at ||
                    post.created_at ||
                    post.submissionDate ||
                    "";
                  const subType = post.track_no
                    ? proposalSubType[post.track_no]
                    : "";
                  const requestedAmount =
                    post.requestedAmount?.toString() ||
                    post.amount?.toString() ||
                    "";
                  const submitter =
                    post.proposer ||
                    post.created_by?.toString() ||
                    post.username ||
                    "";

                  return this.awsDynamoDBService.addItemToTable(tableName, {
                    postId,
                    creationDate,
                    type:
                      tableName === "referendums_v2" || tableName === "tips"
                        ? "proposal"
                        : tableName,
                    subType,
                    categories: post.categories || [],
                    requestedAmount,
                    reward: post.reward?.toString() || "",
                    submitter,
                    docsLinks,
                    vectorFileId: "",
                    post: jsonPost ? jsonPost : post,
                  });
                })
              );

              data.addedData.push(...addedItems.filter(Boolean));
            }

            dataAddedToTables.push(data);
          })
        );
      }

      console.log("Items added into DB");
      
      return { dataAddedToTables };
    } catch (err) {
      console.error("Error - _addDataToDynamoDBTable:", err);
      return null;
    }
  }

  async _updateDataToDynamoDBTable() {
    try {
      const dataUpdatedInTables = [];

      for (const postsType of PostsTypes) {
        const folderPaths = await this.awsStorageService.listFilesAndFolders(
          "folders",
          `${postsType}/`
        );

        const tableNames = folderPaths.map((path) =>
          path.replace(`${postsType}/`, "").replace("/", "")
        );

        await Promise.all(
          tableNames.map(async (tableName) => {
            const isEventsTable = tableName === "events";
            const data = { tableName, updatedData: [] };
            const eventTypes = isEventsTable ? eventsTypeList : [tableName];

            for (const eventType of eventTypes) {
              const fileKey = `${postsType}/${tableName}/${eventType}-List.json`;
              const response = await this.awsStorageService.getFile(fileKey);

              if (!response || !response.Body) {
                console.warn(`File not found: ${fileKey}`);
                continue;
              }

              const jsonData = await streamToString(response.Body as Readable);
              const parsedData = JSON.parse(jsonData);
              if (!parsedData.posts) continue;

              const modifiedPosts = [];
              if (parsedData?.modifiedPostsIds.length > 0) {
                parsedData.posts((post) => {
                  if (
                    parsedData.modifiedPostsIds.contains(post?.post_id) ||
                    parsedData.modifiedPostsIds.contains(post?.id)
                  ) {
                    return post;
                  }
                });
              }

              const updatedItems = await Promise.all(
                modifiedPosts.map(async (post, index) => {
                  const postId =
                    post.post_id?.toString() ||
                    post.id?.toString() ||
                    `index-${index}`;
                  let jsonPostKey;

                  if (postsType === "OnChainPosts") {
                    jsonPostKey = `OnChainPost/${tableName}/${postId}/#${postId}.json`;
                  } else if (postsType === "OffChainPosts") {
                    if (isEventsTable) {
                      jsonPostKey = `OffChainPost/${tableName}/${eventType}/${postId}/#${postId}.json`;
                    } else {
                      jsonPostKey = `OffChainPost/${tableName}/${postId}/#${postId}.json`;
                    }
                  }

                  let jsonPost = null;
                  const docsLinks = [];
                  const jsonPostResponse = await this.awsStorageService.getFile(
                    jsonPostKey
                  );
                  if (!jsonPostResponse || !jsonPostResponse?.Body) {
                    console.warn(`File not found: ${jsonPostKey}`);
                  } else {
                    const jsonPostData = await streamToString(
                      jsonPostResponse.Body as Readable
                    );

                    jsonPost = JSON.parse(jsonPostData);

                    if (jsonPost?.content) {
                      const googleDocsLinks = findGoogleDocsLinks(
                        jsonPost.content
                      );
                      const googleDriveLinks = findGoogleDriveDocsLinks(
                        jsonPost.content
                      );
                      docsLinks.push(...googleDocsLinks);
                      docsLinks.push(...googleDriveLinks);
                    }
                    if (
                      jsonPost?.proposalFolderlLink ||
                      jsonPost?.reportFolderLink
                    ) {
                      if (Array.isArray(typeof jsonPost.proposalFolderlLink)) {
                        docsLinks.push(...jsonPost.proposalFolderlLink);
                      } else {
                        docsLinks.push(jsonPost.proposalFolderlLink);
                      }
                      if (Array.isArray(typeof jsonPost.reportFolderLink)) {
                        docsLinks.push(...jsonPost.reportFolderLink);
                      } else {
                        docsLinks.push(jsonPost.reportFolderLink);
                      }
                    }
                    if (jsonPost?.column_values?.google_doc__1?.url) {
                      if (
                        Array.isArray(jsonPost.column_values.google_doc__1.url)
                      ) {
                        docsLinks.push(
                          ...jsonPost.column_values.google_doc__1.url
                        );
                      } else {
                        docsLinks.push(
                          jsonPost.column_values.google_doc__1.url
                        );
                      }
                    }
                    if (jsonPost?.column_values?.link__1?.url) {
                      if (Array.isArray(jsonPost.column_values.link__1.url)) {
                        docsLinks.push(...jsonPost.column_values.link__1.url);
                      } else {
                        docsLinks.push(jsonPost.column_values.link__1.url);
                      }
                    }
                  }

                  const creationDate =
                    post.timeline?.[0]?.created_at ||
                    post.created_at ||
                    post.submissionDate ||
                    "";
                  const subType = post.track_no
                    ? proposalSubType[post.track_no]
                    : "";
                  const requestedAmount =
                    post.requestedAmount?.toString() ||
                    post.amount?.toString() ||
                    "";
                  const submitter =
                    post.proposer ||
                    post.created_by?.toString() ||
                    post.username ||
                    "";

                  const updateResponse =
                    await this.awsDynamoDBService.updateItemIntoTable(
                      tableName,
                      {
                        postId,
                        creationDate,
                        type:
                          tableName === "referendums_v2" || tableName === "tips"
                            ? "proposal"
                            : tableName,
                        subType,
                        categories: post.categories || [],
                        requestedAmount,
                        reward: post.reward?.toString() || "",
                        submitter,
                        docsLinks,
                        vectorFileId: "",
                        post: jsonPost ? jsonPost : post,
                      }
                    );

                  return updateResponse;
                })
              );

              data.updatedData.push(...updatedItems.filter(Boolean));
            }

            dataUpdatedInTables.push(data);
          })
        );
      }

      return { dataUpdatedInTables };
    } catch (err) {
      console.error("Error - _updateDataToDynamoDBTable:", err);
      return null;
    }
  }

  async _retrieveData(filters: {
    postId: string;
    type: string;
    subType: string;
    category: string[];
    requestedAmount: string;
    requestedAmountOperator: string;
    reward: string;
    rewardOperator: string;
    submitter: string;
    startDate: string;
    endDate: string;
    vectorFileId: string;
  }) {
    try {
      let response = [];

      if (filters && filters.type) {
        if (filters.type === "proposal" || filters.type === "proposals") {
          for (const proposalType of proposalTypes) {
            console.log("proposalType", proposalType);

            const porposalResponse =
              await this.awsDynamoDBService.getFilteredPosts(
                proposalType,
                filters
              );

            response = [...response, ...porposalResponse];
          }
        } else {
          const postsResponse = await this.awsDynamoDBService.getFilteredPosts(
            filters.type,
            filters
          );

          return postsResponse;
        }
      } else {
        const tableNames = [];

        for (const postsType of PostsTypes) {
          const folderPaths = await this.awsStorageService.listFilesAndFolders(
            "folders",
            `${postsType}/`
          );

          folderPaths.forEach((path) => {
            const folderName = path
              .replace(`${postsType}/`, "")
              .replace("/", "");
            tableNames.push(folderName);
          });
        }

        for (const tableName of tableNames) {
          const postsResponse = await this.awsDynamoDBService.getFilteredPosts(
            tableName,
            filters
          );
          response = [...response, ...postsResponse];
        }
      }

      return response;
    } catch (err) {
      console.error("Error - _getPostsData: ", err);
      return null;
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/dynamoDB/createDynamoDBTable:
   *   post:
   *     tags:
   *       - DynamoDB
   *     summary: Create DB Table
   *     responses:
   *       200:
   *         description: DB Table successfully created
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
  @httpPost("/createDynamoDBTable")
  async createDynamoDBTable(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      const tableNames = [];
      const responseData = {};

      for (const postsType of PostsTypes) {
        const folderPaths = await this.awsStorageService.listFilesAndFolders(
          "folders",
          `${postsType}/`
        );

        folderPaths.forEach((path) => {
          const folderName = path.replace(`${postsType}/`, "").replace("/", "");
          tableNames.push(folderName);
        });
      }

      for (const tableName of tableNames) {
        const createdDBTable = await this._createDynamoDBTable(tableName);

        responseData[tableName] = createdDBTable;
      }

      return res.apiSuccess({
        message: "DB Table successfully created",
        data: responseData,
      });
    } catch (err) {
      console.error("Error - createDynamoDBTable: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to create DB Table: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

  /**
   * @swagger
   * /api/dynamoDB/addDataToDynamoDBTable:
   *   post:
   *     tags:
   *       - DynamoDB
   *     summary: Add Data to DynamoDB Table
   *     responses:
   *       200:
   *         description: Data added successfully to DynamoDB Table
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
  @httpPost("/addDataToDynamoDBTable")
  async addDataToDynamoDBTable(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      const response = await this._addDataToDynamoDBTable();

      return res.apiSuccess({
        message: "Data added to DynamoDB successfully",
        data: response,
      });
    } catch (err) {
      console.error("Error - addDataToDynamoDBTable: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to add data to DynamoDB Table: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

  /**
   * @swagger
   * /api/dynamoDB/updateDataToDynamoDBTable:
   *   post:
   *     tags:
   *       - DynamoDB
   *     summary:Update date into DynamoDB Table
   *     responses:
   *       200:
   *         description: Data updated successfully into DynamoDB Table
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
  @httpPost("/updateDataToDynamoDBTable")
  async updateDataToDynamoDBTable(
    @request() req: Request,
    @response() res: Response
  ) {
    try {
      const response = await this._updateDataToDynamoDBTable();

      return res.apiSuccess({
        message: "Data updated into DynamoDB successfully",
        data: response,
      });
    } catch (err) {
      console.error("Error - updateDataToDynamoDBTable: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to update data into DynamoDB Table: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }

/**
 * @swagger
 * /api/dynamoDB/retrieveData:
 *   get:
 *     tags:
 *       - DynamoDB
 *     summary: Get posts data
 *     parameters:
 *       - name: postId
 *         in: query
 *         required: false
 *         description: The ID of the post
 *         schema:
 *           type: string
 *       - name: type
 *         in: query
 *         required: false
 *         description: The type of the proposal
 *         schema:
 *           type: string
 *       - name: subType
 *         in: query
 *         required: false
 *         description: The subType of the proposal
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         required: false
 *         description: The category of the post
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - name: requestedAmount
 *         in: query
 *         required: false
 *         description: The requested amount for the post
 *         schema:
 *           type: string
 *       - name: requestedAmountOperator
 *         in: query
 *         required: false
 *         description: The operator for requested amount comparison
 *         schema:
 *           type: string
 *       - name: reward
 *         in: query
 *         required: false
 *         description: The reward associated with the post
 *         schema:
 *           type: string
 *       - name: rewardOperator
 *         in: query
 *         required: false
 *         description: The operator for reward comparison
 *         schema:
 *           type: string
 *       - name: submitter
 *         in: query
 *         required: false
 *         description: The submitter of the post
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         required: false
 *         description: The start date for filtering posts
 *         schema:
 *           type: string
 *       - name: endDate
 *         in: query
 *         required: false
 *         description: The end date for filtering posts
 *         schema:
 *           type: string
 *       - name: vectorFileId
 *         in: query
 *         required: false
 *         description: The ID of the vector file
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: object
 *               format: binary
 *       404:
 *         description: Files not found
 *       500:
 *         description: Internal server error
 */
  @httpGet("/retrieveData")
  async retrieveData(
    @response() res: Response,
    @queryParam("postId") postId?: string,
    @queryParam("type") type?: string,
    @queryParam("subType") subType?: string,
    @queryParam("category") category?: string[],
    @queryParam("requestedAmount") requestedAmount?: string,
    @queryParam("requestedAmountOperator") requestedAmountOperator?: string,
    @queryParam("reward") reward?: string,
    @queryParam("rewardOperator") rewardOperator?: string,
    @queryParam("submitter") submitter?: string,
    @queryParam("startDate") startDate?: string,
    @queryParam("endDate") endDate?: string,
    @queryParam("vectorFileId") vectorFileId?: string
  ) {
    try {
      const response = await this._retrieveData({
        postId: postId,
        type: type,
        subType: subType,
        category: category,
        requestedAmount: requestedAmount,
        requestedAmountOperator: requestedAmountOperator,
        reward: reward,
        rewardOperator: rewardOperator,
        submitter: submitter,
        startDate: startDate,
        endDate: endDate,
        vectorFileId: vectorFileId,
      });

      return res.apiSuccess(response);
    } catch (err) {
      console.error("Error - getPostsData: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to get Posts Data: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }
}
