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

import { DotEventsService } from "../services/dotevents.service";
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
import { S3Controller } from "./s3.controller";

@controller("/api/dotevents")
export class DotEventsController extends BaseHttpController {
  private readonly filePath: string;

  constructor(
    @inject("DotEventsService")
    private dotEventsService: DotEventsService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("S3Controller") private s3Controller: S3Controller,
  ) {
    super();
  }

  async _findSubmissionsEvents() {
    try {
      const folder = `OffChainPosts/events`;
      const eventsFileName = `events-List.json`;
      const subEventsFileName = `subEvents-List.json`;
      const response = await this.dotEventsService.SubmissionsEvents();

      let result = {
        events:[],
        subEvents:[]
      };

      if (response && response?.board_data) {
        let eventsList = [];
        let subEventsList = [];

        if(response.board_data?.pulses){
          response.board_data.pulses.forEach((pulse)=>{
            eventsList.push({
              ...pulse,
              categories:['Events']
            })
          })
        }

        if(response.board_data?.linked_pulses){
          response.board_data.linked_pulses.forEach((linked_pulse)=>{
            subEventsList.push({
              ...linked_pulse,
              categories:['Events', 'SubEvents']
            })
          })
        }

        result = {
          events: eventsList,
          subEvents: subEventsList,
        };

        // const bufferEvents = Buffer.from(
        //   JSON.stringify({
        //     count: result.events.length,
        //     posts: result.events,
        //   })
        // );

        // const uploadedEventsFileToS3 =
        //   await this.awsStorageService.uploadFilesToS3(
        //     bufferEvents,
        //     `${folder}/events-List.json`,
        //     "application/json"
        //   );

        // const bufferSubevents = Buffer.from(
        //   JSON.stringify({
        //     count: result.subEvents.length,
        //     posts: result.subEvents,
        //   })
        // );

        // const uploadedSubeventsFileToS3 =
        //   await this.awsStorageService.uploadFilesToS3(
        //     bufferSubevents,
        //     `${folder}/subevents-List.json`,
        //     "application/json"
        //   );
      }


      //events
      const storedEventsList = await this.s3Controller._s3GetFile(
        `${folder}/${eventsFileName}`
      );

      let bufferEvents;
      let uploadedEventsFileToS3;
      const modifiedEventsPostsIds = [];

      if (
        storedEventsList === null ||
        typeof storedEventsList === "string" ||
        (storedEventsList &&
          storedEventsList?.count &&
          storedEventsList.count !== result.events.length)
      ) {
        bufferEvents = Buffer.from(
          JSON.stringify({
            modifiedPostsIds: [],
            count: result.events.length,
            posts: result.events,
          })
        );

        uploadedEventsFileToS3 = await this.awsStorageService.uploadFilesToS3(
          bufferEvents,
          `${folder}/${eventsFileName}`,
          "application/json"
        );
      } else {
        if (storedEventsList?.posts) {
          storedEventsList.posts.forEach((post) => {
            result.events.forEach((newPost) => {
              if (
                newPost?.id &&
                post?.id &&
                newPost?.last_updated_data &&
                post?.last_updated_data &&
                newPost.id === post.id
              ) {
                if (newPost.last_updated_data?.last_updated_at != post.last_updated_data?.last_updated_at) {
                  modifiedEventsPostsIds.push(newPost.post_id);
                }
              }
            });
          });

          if (modifiedEventsPostsIds.length > 0) {
            bufferEvents = Buffer.from(
              JSON.stringify({
                modifiedPostsIds: modifiedEventsPostsIds,
                count: result.events.length,
                posts: result.events,
              })
            );

            uploadedEventsFileToS3 = await this.awsStorageService.uploadFilesToS3(
              bufferEvents,
              `${folder}/${eventsFileName}`,
              "application/json"
            );
          }
        }
      }

      //subEvents
      const storedSubEventsList = await this.s3Controller._s3GetFile(
        `${folder}/${subEventsFileName}`
      );

      let bufferSubEvents;
      let uploadedSubEventsFileToS3;
      const modifiedSubEventsPostsIds = [];

      if (
        storedSubEventsList === null ||
        typeof storedSubEventsList === "string" ||
        (storedSubEventsList &&
          storedSubEventsList?.count &&
          storedSubEventsList.count !== result.subEvents.length)
      ) {
        bufferSubEvents = Buffer.from(
          JSON.stringify({
            modifiedPostsIds: [],
            count: result.subEvents.length,
            posts: result.subEvents,
          })
        );

        uploadedSubEventsFileToS3 = await this.awsStorageService.uploadFilesToS3(
          bufferSubEvents,
          `${folder}/${subEventsFileName}`,
          "application/json"
        );
      } else {
        if (storedSubEventsList?.posts) {
          storedSubEventsList.posts.forEach((post) => {
            result.subEvents.forEach((newPost) => {
              if (
                newPost?.id &&
                post?.id &&
                newPost?.last_updated_data &&
                post?.last_updated_data &&
                newPost.id === post.id
              ) {
                if (newPost.last_updated_data?.last_updated_at != post.last_updated_data?.last_updated_at) {
                  modifiedSubEventsPostsIds.push(newPost.post_id);
                }
              }
            });
          });

          if (modifiedSubEventsPostsIds.length > 0) {
            bufferSubEvents = Buffer.from(
              JSON.stringify({
                modifiedPostsIds: modifiedSubEventsPostsIds,
                count: result.subEvents.length,
                posts: result.subEvents,
              })
            );

            uploadedSubEventsFileToS3 = await this.awsStorageService.uploadFilesToS3(
              bufferSubEvents,
              `${folder}/${subEventsFileName}`,
              "application/json"
            );
          }
        }
      }

      return {
        uploadEventsFileToS3: uploadedEventsFileToS3 != undefined ? true : false,
        s3EventsResponse: uploadedEventsFileToS3 != undefined ? uploadedEventsFileToS3 : null,
        uploadSubEventsFileToS3: uploadedSubEventsFileToS3 != undefined ? true : false,
        s3SubEventsResponse: uploadedSubEventsFileToS3 != undefined ? uploadedSubEventsFileToS3 : null,
        data: {
          events:{
            modifiedPostsIds: modifiedEventsPostsIds,
            count: result.events.length,
            posts: result.events,
          },
          subEvents:{
            modifiedPostsIds: modifiedSubEventsPostsIds,
            count: result.subEvents.length,
            posts: result.subEvents,
          }
        },
      };
    } catch (err) {
      console.log("Error - _findSubmissionsEvents: ", err);
      throw Error("_findSubmissionsEvents failed");
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/dotevents/findSubmissionsEvents:
   *   get:
   *     summary: List off-chain Submissions Events posts
   *     responses:
   *       200:
   *         description: Successfully retrieved the Submissions Events
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/findSubmissionsEvents")
  async findSubmissionsEvents(@response() res: Response) {
    try {
      const result = await this._findSubmissionsEvents();

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findSubmissionsEvents: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
