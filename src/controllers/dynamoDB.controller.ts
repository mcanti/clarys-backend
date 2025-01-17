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

import { AwsDynamoDBService } from "../services/awsDynamoDb.service";
import { AwsStorageService } from "../services/awsStorage.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

import {
  PostsTypes,
  proposalTypes,
  proposalSubType,
} from "../constants/dynamoDbTypes";
import { eventsTypeList } from "../constants/proposalTypes";

import { streamToString } from "../helpers/streamToStringHelper";

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
      const tableNames = [];
      const dataAddedToTables = [];

      for (const postsType of PostsTypes) {
        const folderPaths = await this.awsStorageService.listFilesAndFolders(
          "folders",
          `${postsType}/`
        );

        folderPaths.forEach((path) => {
          const folderName = path.replace(`${postsType}/`, "").replace("/", "");
          tableNames.push(folderName);
        });

        for (const tableName of tableNames) {
          if (tableName === "events") {
            const data = { tableName: tableName, addedData: [] };
            for (const eventsType of eventsTypeList) {
              const response = await this.awsStorageService.getFile(
                `${postsType}/${tableName}/${eventsType}-List.json`
              );

              if (!response) {
                return null;
              }

              if (response && !response.Body) {
                return `File with key ${postsType}/${tableName}/${tableName}-List.json not found in S3`;
              }

              const jsonData = await streamToString(response.Body as Readable);
              const parsedData = JSON.parse(jsonData);

              if (parsedData.posts) {
                for (let index = 0; index < parsedData.posts.length; index++) {
                  const postIdExtracted = postsType === "OnChainPosts"
                ? parsedData.posts[index].post_id.toString()
                : parsedData.posts[index].id
                ? parsedData.posts[index].id.toString()
                : `index-${index}`;
                const addedItem = await this.awsDynamoDBService.addItemToTable(
                  tableName,
                  {
                    postId:postIdExtracted,
                    creationDate:
                      postsType === "OnChainPosts"
                        ? parsedData.posts[index].timeline[0].created_at
                        : parsedData.posts[index].created_at
                        ? parsedData.posts[index].created_at
                        : parsedData.posts[index].submissionDate
                        ? parsedData.posts[index].submissionDate
                        : "",
                    type:
                      tableName === "referendums_v2" || tableName === "tips"
                        ? "proposal"
                        : tableName,
                    subType: parsedData.posts[index].track_no
                      ? proposalSubType[parsedData.posts[index].track_no]
                      : "",
                    categories: parsedData.posts[index].categories,
                    requestedAmount: parsedData.posts[index].requestedAmount
                      ? parsedData.posts[index].requestedAmount.toString()
                      : parsedData.posts[index].amount
                      ? parsedData.posts[index].amount.toString()
                      : "",
                    reward: parsedData.posts[index].reward ? parsedData.posts[index].reward.toString() : "",
                    submitter: parsedData.posts[index].proposer
                      ? parsedData.posts[index].proposer
                      : parsedData.posts[index].created_by
                      ? parsedData.posts[index].created_by.toString()
                      : parsedData.posts[index].username ? parsedData.posts[index].username  : "",
                    vectorFileId: "",
                    post: parsedData.posts[index],
                  }
                );
                  if (addedItem) {
                    data.addedData.push(addedItem);
                  } else {
                    data.addedData.push({postIdExtracted:null});
                  }
                }
              }
            }
            dataAddedToTables.push(data);
          } else {
            const response = await this.awsStorageService.getFile(
              `${postsType}/${tableName}/${tableName}-List.json`
            );

            if (!response) {
              return null;
            }

            if (response && !response.Body) {
              return `File with key ${postsType}/${tableName}/${tableName}-List.json not found in S3`;
            }

            const jsonData = await streamToString(response.Body as Readable);
            const parsedData = JSON.parse(jsonData);

            const data = { tableName: tableName, addedData: [] };

            if (parsedData.posts) {
              for (let index = 0; index < parsedData.posts.length; index++) {
                const postIdExtracted = postsType === "OnChainPosts"
                ? parsedData.posts[index].post_id.toString()
                : parsedData.posts[index].id
                ? parsedData.posts[index].id.toString()
                : `index-${index}`;
                const addedItem = await this.awsDynamoDBService.addItemToTable(
                  tableName,
                  {
                    postId:postIdExtracted,
                    creationDate:
                      postsType === "OnChainPosts"
                        ? parsedData.posts[index].timeline[0].created_at
                        : parsedData.posts[index].created_at
                        ? parsedData.posts[index].created_at
                        : parsedData.posts[index].submissionDate
                        ? parsedData.posts[index].submissionDate
                        : "",
                    type:
                      tableName === "referendums_v2" || tableName === "tips"
                        ? "proposal"
                        : tableName,
                    subType: parsedData.posts[index].track_no
                      ? proposalSubType[parsedData.posts[index].track_no]
                      : "",
                    categories: parsedData.posts[index].categories,
                    requestedAmount: parsedData.posts[index].requestedAmount
                      ? parsedData.posts[index].requestedAmount.toString()
                      : parsedData.posts[index].amount
                      ? parsedData.posts[index].amount.toString()
                      : "",
                    reward: parsedData.posts[index].reward ? parsedData.posts[index].reward.toString() : "",
                    submitter: parsedData.posts[index].proposer
                      ? parsedData.posts[index].proposer
                      : parsedData.posts[index].created_by
                      ? parsedData.posts[index].created_by.toString()
                      : parsedData.posts[index].username ? parsedData.posts[index].username  : "",
                    vectorFileId: "",
                    post: parsedData.posts[index],
                  }
                );

                if (addedItem) {
                  data.addedData.push(addedItem);
                } else {
                  data.addedData.push({postIdExtracted: null});
                }
              }
            }

            dataAddedToTables.push(data);
          }
        }
      }

      return { dataAddedToTables: dataAddedToTables };
    } catch (err) {
      console.error("Error - _addDataToDynamoDBTable: ", err);
      return null;
    }
  }

  async _getPostsData(filters: {postId: string,
    type: string,
            subType: string,
            category: string,
            requestedAmount: string,
            reward: string,
            submitter: string,
            date: string,
            dateDifference: string,
            vectorFileId: string}) {
    try {
      let response = [];

      if (filters.type) {
        if (filters.type === "proposal" || filters.type === "proposals") {
          for (const proposalType of proposalTypes) {
            console.log("proposalType", proposalType);

            const porposalResponse = await this.awsDynamoDBService.getFilteredPosts(
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
   * /api/dynamoDB/getPostsData:
   *   get:
   *     tags:
   *       - DynamoDB
   *     summary: Get posts data
   *     parameters:
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
   *       - name: postId
   *         in: query
   *         required: false
   *         description: The ID of the post
   *         schema:
   *           type: string
   *       - name: category
   *         in: query
   *         required: false
   *         description: The category of the post
   *         schema:
   *           type: string
   *       - name: submitter
   *         in: query
   *         required: false
   *         description: The submitter of the post
   *         schema:
   *           type: string
   *       - name: date
   *         in: query
   *         required: false
   *         description: The date specified
   *         schema:
   *           type: string
   *       - name: dateDifference
   *         in: query
   *         required: false
   *         description: The dateDifference diff
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
  @httpGet("/getPostsData")
  async getPostsData(
    @response() res: Response,
    @queryParam("postId") postId?: string,
    @queryParam("type") type?: string,
    @queryParam("subType") subType?: string,
    @queryParam("category") category?: string,
    @queryParam("requestedAmount") requestedAmount?: string,
    @queryParam("reward") reward?: string,
    @queryParam("submitter") submitter?: string,
    @queryParam("date") date?: string,
    @queryParam("dateDifference") dateDifference?: string,
    @queryParam("vectorFileId") vectorFileId?: string,
  ) {
    try {

      await this._getPostsData({postId: postId,
        type: type,
                subType: subType,
                category: category,
                requestedAmount: requestedAmount,
                reward: reward,
                submitter: submitter,
                date: date,
                dateDifference: dateDifference,
                vectorFileId: vectorFileId})
      

      return res.apiSuccess(response);
    } catch (err) {
      console.error("Error - getPostsData: ", err);

      const ErrorResponse = ResponseWrapperCode.generalError;
      ErrorResponse.message = `Failed to get Posts Data: ${err.message}`;
      return res.apiError(ErrorResponse);
    }
  }
}
