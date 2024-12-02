import { injectable, inject } from "inversify";
import cron from "node-cron";

import { AwsStorageService } from "../services/awsStorage.service";
import { FileService } from "../services/file.service";
import { GoogleServices } from "../services/google.services";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import { DotEventsController } from "../controllers/dotevents.controller";
import { DotMeetUpsController } from "../controllers/dotMeetUps.controller";
import { S3Controller } from "../controllers/s3.controller";
import { OpenAIController } from "../controllers/openAI.controller";

import {
  proposalTypeList,
  proposalTypeObject,
  offChainPolkassemblyTypeList,
  offChainTypeList,
  eventsTypeList,
} from "../constants/proposalTypes";

import {
  findFiledId,
  findGoogleDocsLinks,
} from "../helpers/googleDocsLinksFinder.helper";
import { delay } from "../helpers/utilsFunctions.helper";

if (!process.env.FIRST_RUN) {
  throw Error("FIRST_RUN missing");
}

@injectable()
export class SchedulerService {
  private firstRun: boolean;

  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("FileService") private fileService: FileService,
    @inject("GoogleServices") private googleService: GoogleServices,
    @inject("PolkassemblyController")
    private polkassemblyController: PolkassemblyController,
    @inject("DotEventsController")
    private dotEventsController: DotEventsController,
    @inject("DotMeetUpsController")
    private dotMeetUpsController: DotMeetUpsController,
    @inject("S3Controller") private s3Controller: S3Controller,
    @inject("OpenAIController") private openAIController: OpenAIController
  ) {
    this.firstRun = process.env.FIRST_RUN === "true" ? true : false;
  }

  async updateOnChainPosts() {
    // cron.schedule("*/30 * * * *", async () => {
    console.log("Running scheduled task...");

    try {
      await Promise.allSettled(
        proposalTypeList.map(async (proposalType) => {
          await this.polkassemblyController._findOnChainPosts(
            proposalType,
            "All",
            "newest"
          );
          console.log(`Updated ${proposalType}-List`);
        })
      );

      console.log("Scheduled task completed successfully.");
    } catch (err) {
      console.log("Error executing scheduled task:", err);
      throw Error("Error executing scheduled task");
    }
    // });
  }

  async updateOffChainDiscussionsPosts() {
    // cron.schedule("* * * * *", async () => {
    console.log("Running scheduled updateOffChainDiscussionsPosts task...");

    try {
      await Promise.allSettled(
        offChainPolkassemblyTypeList.map(async (proposalType) => {
          await this.polkassemblyController._findOffChainPosts(proposalType);

          console.log(`Updated ${proposalType}-List`);
        })
      );

      console.log(
        "Scheduled updateOffChainDiscussionsPosts task completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOffChainDiscussionsPosts task:",
        err
      );
      throw Error(
        "Error executing scheduled updateOffChainDiscussionsPosts task"
      );
    }
    // });
  }

  async updateOffChainEventsPosts() {
    // cron.schedule("*/30 * * * *", async () => {
    console.log("Running scheduled task...");

    try {
      await this.dotEventsController._findSubmissionsEvents();

      console.log(
        "Scheduled task updateOffChainEventsPosts completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOffChainEventsPosts task:",
        err
      );
      throw Error("Error executing scheduled updateOffChainEventsPosts task");
    }
    // });
  }

  async updateOffChainMeetUpEventsPosts() {
    // cron.schedule("*/30 * * * *", async () => {
    console.log("Running scheduled task...");

    try {
      await this.dotMeetUpsController._findMeetUpEvents();

      console.log(
        "Scheduled task updateOffChainMeetUpEventsPosts completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOffChainMeetUpEventsPosts task:",
        err
      );
      throw Error("Error executing scheduled updateOffChainMeetUpEventsPosts task");
    }
    // });
  }

  async updateOnChainPostFolder() {
    // cron.schedule("*/5 * * * *", async () => {
    console.log("Running scheduled task...");

    try {
      const allPromises = await Promise.allSettled(
        proposalTypeList.map(async (proposalType) => {
          const key = `OnChainPosts/${proposalType}/${proposalType}-List.json`;

          const storedList = await this.s3Controller._s3GetFile(key);
          const existingPostsFolderList =
            await this.s3Controller._s3ListFilesAndFolders(
              "folders",
              `OnChainPost/${proposalType}/`
            );

          if (storedList != null && typeof storedList != "string") {
            if (storedList?.posts) {
              if (
                existingPostsFolderList === null ||
                (existingPostsFolderList &&
                  existingPostsFolderList.length === 0)
              ) {
                return await Promise.allSettled(
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
                return await Promise.allSettled(
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
        })
      );

      console.log("allPromises: ", allPromises);

      console.log(
        "Scheduled updateOnChainPostFolder task completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOnChainPostFolder task:",
        err
      );
      throw Error("Error executing scheduled updateOnChainPostFolder task");
    }
    // });
  }

  async updateOffChainDiscussionsPostFolder() {
    // cron.schedule("* * * * *", async () => {
    console.log("Running scheduled task...");

    try {
      const allPromises = await Promise.allSettled(
        offChainPolkassemblyTypeList.map(async (proposalType) => {
          const key = `OffChainPosts/${proposalType}/${proposalType}-List.json`;

          const storedList = await this.s3Controller._s3GetFile(key);
          const existingPostsFolderList =
            await this.s3Controller._s3ListFilesAndFolders(
              "folders",
              `OffChainPost/${proposalType}/`
            );

          console.log(storedList?.count);

          if (storedList != null && typeof storedList != "string") {
            if (storedList?.posts) {
              if (
                existingPostsFolderList === null ||
                (existingPostsFolderList &&
                  existingPostsFolderList.length === 0)
              ) {
                return await Promise.allSettled(
                  storedList.posts.map(async (post, index) => {
                    await this.polkassemblyController._findOffChainPost(
                      proposalType,
                      post.post_id
                    );
                    if (index === storedList.posts.length - 1) {
                      console.log("last item");
                    }
                  })
                );
              } else if (
                storedList?.modifiedPostsIds &&
                storedList.modifiedPostsIds.length > 0
              ) {
                return await Promise.allSettled(
                  storedList.modifiedPostsIds.map(async (id) => {
                    await this.polkassemblyController._findOffChainPost(
                      proposalType,
                      id
                    );
                  })
                );
              }
            }
          }
        })
      );

      console.log("allPromises: ", allPromises);

      console.log(
        "Scheduled updateOffChainDiscussionsPostFolder task completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOffChainDiscussionsPostFolder task:",
        err
      );
      throw Error(
        "Error executing scheduled updateOffChainDiscussionsPostFolder task"
      );
    }
    // });
  }

  async updateOffChainEventsAndSubEventsPostFolder() {
    // cron.schedule("* * * * *", async () => {
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

          if (storedList != null && typeof storedList != "string") {
            if (storedList?.posts) {
              if (
                existingEventsPostsFolderList === null ||
                (existingEventsPostsFolderList &&
                  existingEventsPostsFolderList.length === 0)
              ) {
                return await Promise.allSettled(
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

                    if (
                      eventType === "subEvents" &&
                      post?.column_values &&
                      post.column_values?.link__1 &&
                      post.column_values.link__1?.url &&
                      post.column_values.link__1.url.length > 0
                    ) {
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
                          post.column_values.status_1__1.index === 2 ||
                          post.column_values.status_1__1.index === 7)) ||
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
                    } else {
                      let folderDocsJson = folderDocs + `${post.id}/docs`;
                      const completeUrls = [];

                      splitUrls.forEach((googleDocUrl) => {
                        completeUrls.push(`https${googleDocUrl}`);
                      });

                      const data = {
                        urls: [completeUrls],
                      };

                      const buffer = Buffer.from(JSON.stringify(data));
                      await this.awsStorageService.uploadFilesToS3(
                        buffer,
                        `${folderDocsJson}/docs_urls.json`,
                        "application/json"
                      );

                      await this.fileService.saveDataToFile(
                        `${folderDocsJson}/docs_urls.json`,
                        data
                      );
                    }

                    const buffer = Buffer.from(JSON.stringify(post));
                    let folderJson = folder + `${post.id}`;
                    const result = await this.awsStorageService.uploadFilesToS3(
                      buffer,
                      `${folderJson}/#${post.id}.json`,
                      "application/json"
                    );

                    await this.fileService.saveDataToFile(
                      `${folderJson}/#${post.id}.json`,
                      post
                    );
                  })
                );
              } else if (
                storedList?.modifiedPostsIds &&
                storedList.modifiedPostsIds.length > 0
              ) {
                return await Promise.allSettled(
                  storedList.modifiedPostsIds.map(async (id) => {
                    let splitUrls = [];

                    const post = storedList.posts.filter(
                      (post) => post.id === id
                    )[0];

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

                    if (
                      eventType === "subEvents" &&
                      post?.column_values &&
                      post.column_values?.link__1 &&
                      post.column_values.link__1?.url &&
                      post.column_values.link__1.url.length > 0
                    ) {
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
                          post.column_values.status_1__1.index === 2 ||
                          post.column_values.status_1__1.index === 7)) ||
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
                    } else {
                      let folderDocsJson = folderDocs + `${post.id}/docs`;
                      const completeUrls = [];

                      splitUrls.forEach((googleDocUrl) => {
                        completeUrls.push(`https${googleDocUrl}`);
                      });

                      const data = {
                        urls: [completeUrls],
                      };

                      const buffer = Buffer.from(JSON.stringify(data));
                      await this.awsStorageService.uploadFilesToS3(
                        buffer,
                        `${folderDocsJson}/docs_urls.json`,
                        "application/json"
                      );

                      await this.fileService.saveDataToFile(
                        `${folderDocsJson}/docs_urls.json`,
                        data
                      );
                    }

                    const buffer = Buffer.from(JSON.stringify(post));
                    let folderJson = folder + `${post.id}`;
                    const result = await this.awsStorageService.uploadFilesToS3(
                      buffer,
                      `${folderJson}/#${post.id}.json`,
                      "application/json"
                    );

                    await this.fileService.saveDataToFile(
                      `${folderJson}/#${post.id}.json`,
                      post
                    );
                  })
                );
              }
            }
          }
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
    // });
  }

  async updateOffChainMeetUpEventsPostFolder() {
    // cron.schedule("* * * * *", async () => {
    console.log(
      "Running scheduled updateOffChainEventsAndSubEventsPostFolder task ..."
    );

    try {
      const proposalType = "meetups";

      const key = `OffChainPosts/${proposalType}/meetups-List.json`;
      let folder = `OffChainPost/${proposalType}/`;
      let folderDocs = `OffChainPost/${proposalType}/`;

      const storedList = await this.s3Controller._s3GetFile(key);

      const existingMeetUpsEventsPostsFolderList =
        await this.s3Controller._s3ListFilesAndFolders(
          "folders",
          `OffChainPost/${proposalType}/`
        );

      if (storedList != null && typeof storedList != "string") {
        if (storedList?.posts) {
          if (
            existingMeetUpsEventsPostsFolderList === null ||
            (existingMeetUpsEventsPostsFolderList &&
              existingMeetUpsEventsPostsFolderList.length === 0)
          ) {
            return await Promise.allSettled(
              storedList.posts.map(async (post) => {
                const splitUrls = [];

                if (post?.proposalFolderlLink) {
                  const proposalLinks = post.newProposaFolderlLink
                    .split("https")
                    .filter((part) => part !== "");

                  proposalLinks.forEach((link) => {
                    splitUrls.push(`https${link}`);
                  });
                }

                if (post?.reportFolderLink) {
                  const reportLinks = post.newProposaFolderlLink
                    .split("https")
                    .filter((part) => part !== "");

                  reportLinks.forEach((link) => {
                    splitUrls.push(`https${link}`);
                  });
                }

                const docsLinks = splitUrls.map((url) => {
                  return findGoogleDocsLinks(url)[0];
                });

                const filesIds = [];
                docsLinks.forEach((googleDocUrl) => {
                  const fieldId = findFiledId(googleDocUrl);
                  if (!fieldId) {
                    console.log("Invalid Google Docs URL provided.");
                  } else {
                    filesIds.push(fieldId);
                  }
                });

                //saving files
                const savingFilesStatuses = [
                  "Accepted",
                  "Child Bounty awarded",
                  "Rejected",
                  "Cancelled",
                  "Child Bounty added",
                ];

                if (savingFilesStatuses.includes(post.status)) {
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
                } else {
                  let folderDocsJson = folderDocs + `${post.id}/docs`;
                  const completeUrls = [];

                  splitUrls.forEach((googleDocUrl) => {
                    completeUrls.push(`https${googleDocUrl}`);
                  });

                  const data = {
                    urls: [completeUrls],
                  };

                  const buffer = Buffer.from(JSON.stringify(data));
                  await this.awsStorageService.uploadFilesToS3(
                    buffer,
                    `${folderDocsJson}/docs_urls.json`,
                    "application/json"
                  );

                  await this.fileService.saveDataToFile(
                    `${folderDocsJson}/docs_urls.json`,
                    data
                  );
                }

                const buffer = Buffer.from(JSON.stringify(post));

                let folderJson = folder + `${post.id}`;
                await this.awsStorageService.uploadFilesToS3(
                  buffer,
                  `${folderJson}/#${post.id}.json`,
                  "application/json"
                );

                // await this.fileService.saveDataToFile(
                //   `${folderJson}/#${post.id}.json`,
                //   post
                // );
              })
            );
          } else if (
            storedList?.modifiedPostsIds &&
            storedList.modifiedPostsIds.length > 0
          ) {
            //
          }
        }
      }

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
    // });
  }

  //OPEN AI

  // async executeWithBackoff(asyncFunc, maxRetries = 5, baseDelay = 350) {
  //   for (let attempt = 1; attempt <= maxRetries; attempt++) {
  //     try {
  //       await delay(baseDelay);
  //       return await asyncFunc();
  //     } catch (error) {
  //       if (error.response?.status === 429 && attempt < maxRetries) {
  //         const delayTime = baseDelay * 2 ** (attempt - 1);
  //         console.log(`Rate limit hit. Retrying in ${delayTime} ms...`);
  //         await delay(delayTime); // Calls the delay function to wait
  //       } else {
  //         throw error;
  //       }
  //     }
  //   }
  // }

  // async batchProcess(array, batchSize, callback) {
  //   for (let i = 0; i < array.length; i += batchSize) {
  //     const batch = array.slice(i, i + batchSize);

  //     for (const item of batch) {
  //       await callback(item);
  //     }
  //   }
  // }

  // async deleteOldFiles(proposalType, storedList) {
  //   try {
  //     const info = await this.openAIController._listFiles(
  //       "assistants",
  //       undefined,
  //       "desc"
  //     );

  //     const fileIdsToBeDeleted = [];

  //     storedList.modifiedPostsIds.forEach((postId) => {
  //       info.data.forEach((fileData) => {
  //         if (
  //           fileData.filename.includes(
  //             `${proposalTypeObject[proposalType]}-Id${postId}`
  //           )
  //         ) {
  //           fileIdsToBeDeleted.push(fileData.id);
  //         }
  //       });
  //     });

  //     await this.batchProcess(fileIdsToBeDeleted, 5, async (file_id) => {
  //       await this.executeWithBackoff(() =>
  //         this.openAIController._deleteVectorStoreFile(file_id)
  //       );
  //       await this.executeWithBackoff(() =>
  //         this.openAIController._deleteFile(file_id)
  //       );
  //     });
  //   } catch (err) {
  //     console.log("Error deleteOldFiles: ", err);
  //   }
  // }

  // async deleteFilesOnFirstRun(proposalType) {
  //   try {
  //     const info = await this.openAIController._listFiles(
  //       "assistants",
  //       undefined,
  //       "desc"
  //     );

  //     const fileIdsToBeDeleted = info.data
  //       .filter((fileData) =>
  //         fileData.filename.includes(proposalTypeObject[proposalType])
  //       )
  //       .map((fileData) => fileData.id);

  //     await this.batchProcess(fileIdsToBeDeleted, 10, async (file_id) => {
  //       await this.executeWithBackoff(() =>
  //         this.openAIController._deleteVectorStoreFile(file_id)
  //       );
  //       await this.executeWithBackoff(() =>
  //         this.openAIController._deleteFile(file_id)
  //       );
  //     });
  //   } catch (err) {
  //     console.log("Error deleteFilesOnFirstRun:", err);
  //   }
  // }

  // async uploadToVectorStoreInBatch(list) {
  //   try {
  //     const batchResponse = await this.executeWithBackoff(() =>
  //       this.openAIController._createVectorStoreFilesBatch(list)
  //     );

  //     console.log("Vector store batch response", batchResponse);
  //   } catch (err) {
  //     console.log("Error executing uploadToVectorStoreInBatch", err);
  //   }
  // }

  // async uploadNewFiles(proposalType, storedList, modifiedPostsIds) {
  //   const listOfJsonFiles: string[] = [];
  //   const listOfDocxFiles: string[] = [];
  //   try {
  //     for (const post of storedList.posts) {
  //       // Check if we're uploading all posts or only modified ones
  //       if (
  //         modifiedPostsIds === null ||
  //         modifiedPostsIds.includes(post.post_id)
  //       ) {
  //         const folderKey = `OnChainPost/${proposalType}/${post.post_id}/`;

  //         // Upload JSON file
  //         const jsonToUpload = await this.s3Controller._s3GetFile(
  //           folderKey + `#${post.post_id}.json`
  //         );

  //         const jsonResponse = await this.executeWithBackoff(() =>
  //           this.openAIController._uploadFile(
  //             jsonToUpload,
  //             `${proposalTypeObject[proposalType]}-Id${post.post_id}.json`
  //           )
  //         );

  //         if (jsonResponse && jsonResponse?.id) {
  //           listOfJsonFiles.push(jsonResponse.id);
  //         }

  //         // await this.executeWithBackoff(() =>
  //         //   this.openAIController._createVectorStoreFile(jsonResponse.id)
  //         // );

  //         // Introduce delay to prevent rate limiting
  //         await delay(1000);

  //         // Upload document files if any
  //         const existingDocsList =
  //           await this.s3Controller._s3ListFilesAndFolders(
  //             "folders",
  //             folderKey
  //           );

  //         for (const existingDocs of existingDocsList) {
  //           const docFiles = await this.s3Controller._s3ListFilesAndFolders(
  //             "files",
  //             existingDocs
  //           );

  //           for (const docFileKey of docFiles) {
  //             try {
  //               const docToUpload = await this.s3Controller._s3GetFile(
  //                 docFileKey
  //               );
  //               const docFileIdAndFormat = docFileKey.split(
  //                 `OnChainPost/${proposalType}/${post.post_id}/docs/`
  //               )[1];

  //               const docResponse = await this.executeWithBackoff(() =>
  //                 this.openAIController._uploadFile(
  //                   "assistants",
  //                   docToUpload,
  //                   `${proposalTypeObject[proposalType]}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
  //                 )
  //               );
  //               if (docResponse && docResponse?.id) {
  //                 listOfDocxFiles.push(docResponse.id);
  //               }
  //               // await this.executeWithBackoff(() =>
  //               //   this.openAIController._createVectorStoreFile(docResponse.id)
  //               // );

  //               // Delay to manage rate limits between uploads
  //               await delay(1000);
  //             } catch (docError) {
  //               console.error(
  //                 `Error uploading document file for post ID ${post.post_id}:`,
  //                 docError
  //               );
  //             }
  //           }
  //         }
  //       }
  //     }
  //     return { listOfJsonFiles, listOfDocxFiles };
  //   } catch (err) {
  //     console.error(`Error uploading files`, err);
  //   }
  // }

  // async uploadOnChainFilesOpenAI() {
  //   cron.schedule("0 * * * *", async () => {
  //     console.log("Running scheduled uploadOnChainFilesOpenAI task...");
  //     const startTime = Date.now();
  //     console.log(
  //       `uploadOnChainFilesOpenAI started at ${new Date(
  //         startTime
  //       ).toISOString()}`
  //     );

  //     try {
  //       for (
  //         let proposalTypeIterator = 0;
  //         proposalTypeIterator < proposalTypeList.length;
  //         proposalTypeIterator++
  //       ) {
  //         const key = `OnChainPosts/${proposalTypeList[proposalTypeIterator]}/${proposalTypeList[proposalTypeIterator]}-List.json`;
  //         const storedList = await this.s3Controller._s3GetFile(key);
  //         const existingPostsFolderList =
  //           await this.s3Controller._s3ListFilesAndFolders(
  //             "folders",
  //             `OnChainPost/${proposalTypeList[proposalTypeIterator]}/`
  //           );

  //         if (
  //           storedList &&
  //           typeof storedList !== "string" &&
  //           storedList.posts
  //         ) {
  //           // Update files if modifiedPostsIds are present
  //           if (
  //             storedList.modifiedPostsIds &&
  //             storedList.modifiedPostsIds.length > 0
  //           ) {
  //             const { listOfJsonFiles, listOfDocxFiles } =
  //               await this.uploadNewFiles(
  //                 proposalTypeList[proposalTypeIterator],
  //                 storedList,
  //                 storedList.modifiedPostsIds
  //               );
  //             console.log(
  //               `Fiished Uploading files to storage,${listOfJsonFiles.length} json files and ${listOfDocxFiles} docx files`
  //             );
  //             console.log("Loading files in vector storage ...");
  //             await this.uploadToVectorStoreInBatch(listOfJsonFiles);
  //             await this.uploadToVectorStoreInBatch(listOfDocxFiles);
  //           }

  //           // Initial Run: Update all files
  //           if (this.firstRun) {
  //             const { listOfJsonFiles, listOfDocxFiles } =
  //               await this.uploadNewFiles(
  //                 proposalTypeList[proposalTypeIterator],
  //                 storedList,
  //                 null
  //               );

  //             console.log(
  //               `Fiished Uploading files to storage,${listOfJsonFiles.length} json files and ${listOfDocxFiles.length} docx files`
  //             );
  //             console.log("Loading files in vector storage ...");

  //             // Process lists in chunks
  //             const maxLengthArray = 490;
  //             for (
  //               let listOfJsonFilesIndex = 0;
  //               listOfJsonFilesIndex < listOfJsonFiles.length;
  //               listOfJsonFilesIndex += maxLengthArray
  //             ) {
  //               const chunk = listOfJsonFiles.slice(
  //                 listOfJsonFilesIndex,
  //                 listOfJsonFilesIndex + maxLengthArray
  //               );
  //               await this.uploadToVectorStoreInBatch(chunk);
  //             }

  //             for (
  //               let listOfJsonFilesIndex = 0;
  //               listOfJsonFilesIndex < listOfDocxFiles.length;
  //               listOfJsonFilesIndex += maxLengthArray
  //             ) {
  //               const chunk = listOfJsonFiles.slice(
  //                 listOfJsonFilesIndex,
  //                 listOfJsonFilesIndex + maxLengthArray
  //               );
  //               await this.uploadToVectorStoreInBatch(chunk);
  //             }

  //             const endTime = Date.now();
  //             const deltaTime = endTime - startTime;
  //             console.log(
  //               `uploadOnChainFilesOpenAI ended  at ${new Date(
  //                 endTime
  //               ).toISOString()}`
  //             );
  //             console.log(`uploadOnChainFilesOpenAI took ${deltaTime} ms`);
  //           }
  //         }
  //       }

  //       console.log(
  //         "Scheduled uploadOnChainFilesOpenAI task completed successfully."
  //       );
  //     } catch (err) {
  //       console.log(
  //         "Error executing scheduled uploadOnChainFilesOpenAI task:",
  //         err
  //       );
  //       throw new Error(
  //         "Error executing scheduled uploadOnChainFilesOpenAI task"
  //       );
  //     }
  //   });
  // }
}
