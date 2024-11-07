import { injectable, inject } from "inversify";
import cron from "node-cron";

import { AwsStorageService } from "../services/awsStorage.service";
import { GoogleServices } from "../services/google.services";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import { S3Controller } from "../controllers/s3.controller";

import {
  proposalTypeList,
  offChainTypeList,
  eventsTypeList,
} from "../constants/proposalTypes";

import {
  findFiledId,
  findGoogleDocsLinks,
} from "../helpers/googleDocsLinksFinder.helper";

@injectable()
export class SchedulerService {
  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("GoogleServices") private googleService: GoogleServices,
    @inject("PolkassemblyController")
    private polkassemblyController: PolkassemblyController,
    @inject("S3Controller") private s3Controller: S3Controller
  ) {}

  async updateOnChainPosts() {
    cron.schedule("*/30 * * * *", async () => {
      console.log("Running scheduled task...");

      try {
        // proposalTypeList.map(async (proposalType) => {
        //     await this.taskService._findOnChainPosts(
        //       proposalType,
        //       "All",
        //       "newest"
        //     );
        //     console.log(`Updated ${proposalType}-List`);

        // });

        console.log("Scheduled task completed successfully.");
      } catch (err) {
        console.log("Error executing scheduled task:", err);
        throw Error("Error executing scheduled task");
      }
    });
  }

  async updateOnChainPostFolder() {
    cron.schedule("*/2 * * * *", async () => {
      console.log("Running scheduled task...");

      try {
        const allPromises = await Promise.allSettled(
          proposalTypeList.map(async (proposalType) => {
            const key = `OnChainPosts/${proposalType}/${proposalType}-List.json`;

            const storedList = await this.s3Controller._s3GetFile(key);
            const existingPostsFolderList =
              await this.s3Controller._s3ListFilesAndFolders(
                "folders",
                "OnChainPost/proposalType/"
              );

            let result = {
              proposalType: proposalType,
              promises: [],
            };

            if (storedList != null && typeof storedList != "string") {
              if (storedList?.posts) {
                if (existingPostsFolderList.length === 0) {
                  result.promises = await Promise.allSettled(
                    storedList.posts.map(async (post) => {
                      await this.polkassemblyController._findOnChainPost(
                        proposalType,
                        post.post_id
                      );
                    })
                  );
                } else if (
                  storedList?.modifiedPostsIds &&
                  storedList.modifiedPostsIds.length > 0
                ) {
                  result.promises = await Promise.all(
                    storedList.modifiedPostsIds.map(async (id) => {
                      await this.polkassemblyController._findOnChainPost(
                        proposalType,
                        id
                      );
                    })
                  );
                }
              }
            }

            return result;
          })
        );

        console.log("allPromises: ", allPromises);

        console.log(
          "Scheduled task  updateBountiesPost completed successfully."
        );
      } catch (err) {
        console.log("Error executing scheduled updateBountiesPost task:", err);
        throw Error("Error executing scheduled updateBountiesPost task");
      }
    });
  }

  async updateOffChainEventsAndSubEventsPostFolder() {
    cron.schedule("* * * * *", async () => {
      console.log(
        "Running scheduled updateOffChainEventsAndSubEventsPostFolder task ..."
      );

      try {
        const proposalType = "events";

        const allPromises = await Promise.allSettled(
          eventsTypeList.map(async (eventType) => {
            const key = `OffChainPosts/${proposalType}/${eventType}-List.json`;
            let folder = `OffChainPost/${proposalType}/${eventType}/`;
            let folderDocs = `OffChainPost/${proposalType}/${eventType}/`;

            const storedList = await this.s3Controller._s3GetFile(key);

            const existingEventsPostsFolderList =
              await this.s3Controller._s3ListFilesAndFolders(
                "folders",
                `OffChainPost/events/`
              );

            let result = {
              proposalType: proposalType,
              eventType: eventType,
              promises: [],
            };

            if (storedList != null && typeof storedList != "string") {
              if (storedList?.posts) {
                if (existingEventsPostsFolderList.length === 0) {
                  result.promises = await Promise.allSettled(
                    storedList.posts.map(async (post) => {
                      let splitUrls = [];

                      if (
                        eventType === "events" &&
                        post?.column_values &&
                        post.column_values?.google_doc__1 &&
                        post.column_values.google_doc__1?.url &&
                        post.column_values.google_doc__1.url.length > 0
                      ) {
                        splitUrls = post.column_values.google_doc__1.url
                          .split("https")
                          .filter((part) => part !== "");
                      }

                      if(
                        eventType === "subEvents" &&
                      post?.column_values &&
                      post.column_values?.link__1 &&
                      post.column_values.link__1?.url &&
                      post.column_values.link__1.url.length > 0
                      ){
                        splitUrls = post.column_values.link__1.url
                        .split("https")
                        .filter((part) => part !== "");
                      }

                      // filter for saving docx files
                      if (
                        (eventType === "events" &&
                          post?.column_values &&
                          post.column_values?.status_1__1 &&
                          post.column_values.status_1__1?.index &&
                          (post.column_values.status_1__1.index === 1 ||
                            post.column_values.status_1__1.index === 2)) ||
                        (eventType === "subEvents" &&
                          post?.column_values &&
                          post.column_values?.status &&
                          post.column_values.status?.index &&
                          post.column_values.status.index === 6)
                      ) {
                        const filesIds = [];
                        splitUrls.forEach((googleDocUrl) => {
                          const fieldId = findFiledId(`https${googleDocUrl}`);
                          if (!fieldId) {
                            console.log("Invalid Google Docs URL provided.");
                          } else {
                            filesIds.push(fieldId);
                          }
                        });

                        let folderDocsFile = folderDocs + `${post.id}/docs`;

                        if (filesIds.length) {
                          await Promise.all(
                            filesIds.map(async (fileId) => {
                              await this.googleService.uploadGoogleDocToS3(
                                fileId,
                                folderDocsFile
                              );
                            })
                          );
                        }
                      } else{
                        let folderDocsJson = folderDocs + `${post.id}/docs`;
                        const completeUrls = [];

                        splitUrls.forEach((googleDocUrl) => {
                          completeUrls.push(`https${googleDocUrl}`);
                        });

                        const data = {
                          urls: [completeUrls]
                        }

                        const buffer = Buffer.from(JSON.stringify(post));
                        await this.awsStorageService.uploadFilesToS3(
                          buffer,
                          `${folderDocsJson}/docs_urls.json`,
                          "application/json"
                        );

                      }

                      const buffer = Buffer.from(JSON.stringify(post));
                      let folderJson = folder + `${post.id}`;
                      const result =
                        await this.awsStorageService.uploadFilesToS3(
                          buffer,
                          `${folderJson}/#${post.id}.json`,
                          "application/json"
                        );
                    })
                  );
                } else if (
                  storedList?.modifiedPostsIds &&
                  storedList.modifiedPostsIds.length > 0
                ) {
                  console.log("testing");
                }
              }
            }

            return result;
          })
        );

        console.log("allPromises: ", allPromises);

        console.log(
          "Scheduled task updateOffChainEventsAndSubEventsPostFolder completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled updateOffChainEventsAndSubEventsPostFolder task:",
          err
        );
        throw Error(
          "Error executing scheduled updateOffChainEventsAndSubEventsPostFolder task"
        );
      }
    });
  }
}
