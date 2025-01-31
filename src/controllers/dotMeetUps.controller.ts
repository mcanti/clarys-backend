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

import { DotMeetUpService } from "../services/dotmeetup.service";
import { AwsStorageService } from "../services/awsStorage.service";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

import { FileService } from "../services/file.service";
import { GoogleServices } from "../services/google.services";
import {
  findFiledId,
  findGoogleDocsLinks,
} from "../helpers/googleDocsLinksFinder.helper";

import { CategoriesList } from "../constants/postCategories";
import { tagsCategories } from "../constants/tagsCategory";
import { S3Controller } from "./s3.controller";

@controller("/api/dotmeetup")
export class DotMeetUpsController extends BaseHttpController {
  private readonly filePath: string;

  constructor(
    @inject("DotMeetUpService")
    private dotMeetUpService: DotMeetUpService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("S3Controller") private s3Controller: S3Controller
  ) {
    super();
  }

  async _findMeetUpEvents() {
    try {
      const folder = `OffChainPosts/meetups`;
      const meetUpEventsFileName = `meetups-List.json`;

      const response = await this.dotMeetUpService.getSubmitedMeetUps({});

      let result = {
        meetUpEvents: [],
      };

      if (
        response &&
        response?.allBlockIds &&
        response.allBlockIds.length > 0 &&
        response?.recordMap &&
        response?.recordMap?.block
      ) {
        response.allBlockIds.forEach((blockId) => {
          const unsortedData = response.recordMap.block[blockId];

          const meetUpEvent = {
            id: blockId,
            title:
              unsortedData.value.value.properties.title &&
              unsortedData.value.value.properties.title["0"] &&
              unsortedData.value.value.properties.title["0"][0]
                ? unsortedData.value.value.properties.title["0"][0]
                : "",
            status:
              unsortedData.value.value.properties["~lC}"] &&
              unsortedData.value.value.properties["~lC}"]["0"] &&
              unsortedData.value.value.properties["~lC}"]["0"][0]
                ? unsortedData.value.value.properties["~lC}"]["0"][0]
                : "",
            childBountyId:
              unsortedData.value.value.properties["ws@j"] &&
              unsortedData.value.value.properties["ws@j"]["0"] &&
              unsortedData.value.value.properties["ws@j"]["0"][0]
                ? unsortedData.value.value.properties["ws@j"]["0"][0]
                : "",
            submissionDate:
              unsortedData.value.value.properties["Ki`K"] &&
              unsortedData.value.value.properties["Ki`K"]["0"] &&
              unsortedData.value.value.properties["Ki`K"]["0"]["1"] &&
              unsortedData.value.value.properties["Ki`K"]["0"]["1"]["0"] &&
              unsortedData.value.value.properties["Ki`K"]["0"]["1"]["0"]["1"] &&
              unsortedData.value.value.properties["Ki`K"]["0"]["1"]["0"]["1"]
                .start_date
                ? unsortedData.value.value.properties["Ki`K"]["0"]["1"]["0"][
                    "1"
                  ].start_date
                : "",
            amount:
              unsortedData.value.value.properties["Fam}"] &&
              unsortedData.value.value.properties["Fam}"]["0"] &&
              unsortedData.value.value.properties["Fam}"]["0"][0]
                ? unsortedData.value.value.properties["Fam}"]["0"][0]
                : "",
            proposer:
              unsortedData.value.value.properties["uamZ"] &&
              unsortedData.value.value.properties["uamZ"]["0"] &&
              unsortedData.value.value.properties["uamZ"]["0"][0]
                ? unsortedData.value.value.properties["uamZ"]["0"][0]
                : "",
            curator: "",
            eventDate:
              unsortedData.value.value.properties["<?^|"] &&
              unsortedData.value.value.properties["<?^|"]["0"] &&
              unsortedData.value.value.properties["<?^|"]["0"]["1"] &&
              unsortedData.value.value.properties["<?^|"]["0"]["1"]["0"] &&
              unsortedData.value.value.properties["<?^|"]["0"]["1"]["0"]["1"] &&
              unsortedData.value.value.properties["<?^|"]["0"]["1"]["0"]["1"]
                .start_date
                ? unsortedData.value.value.properties["<?^|"]["0"]["1"]["0"][
                    "1"
                  ].start_date
                : "",
            proposalFolderlLink:
              unsortedData.value.value.properties["uck:"] &&
              unsortedData.value.value.properties["uck:"]["0"] &&
              unsortedData.value.value.properties["uck:"]["0"]["1"] &&
              unsortedData.value.value.properties["uck:"]["0"]["1"]["0"] &&
              unsortedData.value.value.properties["uck:"]["0"]["1"]["0"][1]
                ? unsortedData.value.value.properties["uck:"]["0"]["1"]["0"][1]
                : "",
            reportFolderLink:
              unsortedData.value.value.properties["D=:b"] &&
              unsortedData.value.value.properties["D=:b"]["0"] &&
              unsortedData.value.value.properties["D=:b"]["0"]["1"] &&
              unsortedData.value.value.properties["D=:b"]["0"]["1"]["0"] &&
              unsortedData.value.value.properties["D=:b"]["0"]["1"]["0"][1]
                ? unsortedData.value.value.properties["D=:b"]["0"]["1"]["0"][1]
                : "",
            address:
              unsortedData.value.value.properties["siNH"] &&
              unsortedData.value.value.properties["siNH"]["0"] &&
              unsortedData.value.value.properties["siNH"]["0"][0]
                ? unsortedData.value.value.properties["siNH"]["0"][0]
                : "",
            comment:
              unsortedData.value.value.properties["D]@X"] &&
              unsortedData.value.value.properties["D]@X"]["0"] &&
              unsortedData.value.value.properties["D]@X"]["0"][0]
                ? unsortedData.value.value.properties["D]@X"]["0"][0]
                : "",
            categories: ["Events"],
          };

          result.meetUpEvents.push(meetUpEvent);
        });
      }

      //events
      const storedMeetUpEventsList = await this.s3Controller._s3GetFile(
        `${folder}/${meetUpEventsFileName}`
      );

      let bufferEvents;
      let uploadedMeetUpEventsFileToS3;
      const modifiedMeetUpEventsPostsIds = [];

      if (
        storedMeetUpEventsList === null ||
        typeof storedMeetUpEventsList === "string" ||
        (storedMeetUpEventsList &&
          storedMeetUpEventsList?.count &&
          result.meetUpEvents.length > storedMeetUpEventsList.count)
      ) {
        bufferEvents = Buffer.from(
          JSON.stringify({
            modifiedPostsIds: [],
            count: result.meetUpEvents.length,
            posts: result.meetUpEvents,
          })
        );

        uploadedMeetUpEventsFileToS3 =
          await this.awsStorageService.uploadFilesToS3(
            bufferEvents,
            `${folder}/${meetUpEventsFileName}`,
            "application/json"
          );
      } else if (result.meetUpEvents.length > 0) {
        if (storedMeetUpEventsList?.posts) {
          storedMeetUpEventsList.posts.forEach((post) => {
            result.meetUpEvents.forEach((newPost) => {
              if (
                newPost?.id &&
                post?.id &&
                newPost?.status &&
                post?.status &&
                newPost.id === post.id
              ) {
                if (newPost.status != post.status) {
                  modifiedMeetUpEventsPostsIds.push(newPost.post_id);
                }
              }
            });
          });

          if (modifiedMeetUpEventsPostsIds.length > 0) {
            bufferEvents = Buffer.from(
              JSON.stringify({
                modifiedPostsIds: modifiedMeetUpEventsPostsIds,
                count: result.meetUpEvents.length,
                posts: result.meetUpEvents,
              })
            );

            uploadedMeetUpEventsFileToS3 =
              await this.awsStorageService.uploadFilesToS3(
                bufferEvents,
                `${folder}/${meetUpEventsFileName}`,
                "application/json"
              );
          }
        }
      }

      return {
        uploadEventsFileToS3:
          uploadedMeetUpEventsFileToS3 != undefined ? true : false,
        s3EventsResponse:
          uploadedMeetUpEventsFileToS3 != undefined
            ? uploadedMeetUpEventsFileToS3
            : null,
        data: {
          meetUpEvents: {
            modifiedPostsIds: modifiedMeetUpEventsPostsIds,
            count: result.meetUpEvents.length,
            posts: result.meetUpEvents,
          },
        },
      };
    } catch (err) {
      console.log("Error - _findMeetUpEvents: ", err);
      throw Error("_findMeetUpEvents failed");
    }
  }

  // Exposing API endpoints

  /**
   * @swagger
   * /api/dotmeetup/findMeetUpEvents:
   *   get:
   *     tags:
   *       - DotMeetUp
   *     summary: List off-chain MeetUps Events posts
   *     responses:
   *       200:
   *         description: Successfully retrieved the MeetUps Events
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
  @httpGet("/findMeetUpEvents")
  async findMeetUpEvents(@response() res: Response) {
    try {
      const result = await this._findMeetUpEvents();

      res.apiSuccess({
        ...result,
      });
    } catch (err) {
      console.log("Error - findMeetUpEvents: ", err);
      res.apiError(ResponseWrapperCode.generalError);
    }
  }
}
