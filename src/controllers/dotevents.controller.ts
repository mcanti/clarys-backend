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

@controller("/api/dotevents")
export class DotEventsController extends BaseHttpController {
  private readonly filePath: string;

  constructor(
    @inject("DotEventsService")
    private dotEventsService: DotEventsService,
    @inject("AwsStorageService") private awsStorageService: AwsStorageService
  ) {
    super();
  }

  async _findSubmissionsEvents() {
    try {
      const folder = `OffChainPosts/events`;
      const response = await this.dotEventsService.SubmissionsEvents();

      //   const buffer = Buffer.from(
      //     JSON.stringify({
      //       count: postsWithCategories.length,
      //       posts: postsWithCategories,
      //     })
      //   );

      //   const uploadedFileToS3 = await this.awsStorageService.uploadFilesToS3(
      //     buffer,
      //     `${folder}/${proposalType}-List.json`,
      //     "application/json"
      //   );

      let result = {
        events:[],
        subEvents:[]
      };

      if (response && response?.board_data) {
        result = {
          events: response.board_data?.pulses || [],
          subEvents: response.board_data?.linked_pulses || [],
        };

        const bufferEvents = Buffer.from(
          JSON.stringify({
            count: result.events.length,
            posts: result.events,
          })
        );

        const uploadedEventsFileToS3 =
          await this.awsStorageService.uploadFilesToS3(
            bufferEvents,
            `${folder}/events-List.json`,
            "application/json"
          );

        const bufferSubevents = Buffer.from(
          JSON.stringify({
            count: result.subEvents.length,
            posts: result.subEvents,
          })
        );

        const uploadedSubeventsFileToS3 =
          await this.awsStorageService.uploadFilesToS3(
            bufferSubevents,
            `${folder}/subevents-List.json`,
            "application/json"
          );
      }

      return result;
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
