import { injectable, inject } from "inversify";
import cron from "node-cron";

import { AwsStorageService } from "../services/awsStorage.service";
import { GoogleServices } from "../services/google.services";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
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

@injectable()
export class SchedulerService {
  private uploadOnChainFilesToOpenAIFirstRun: boolean;
  private uploadOffChainFilesToOpenAIFirstRun: boolean;

  constructor(
    @inject("AwsStorageService") private awsStorageService: AwsStorageService,
    @inject("GoogleServices") private googleService: GoogleServices,
    @inject("PolkassemblyController")
    private polkassemblyController: PolkassemblyController,
    @inject("S3Controller") private s3Controller: S3Controller,
    @inject("OpenAIController") private openAIController: OpenAIController
  ) {
    this.uploadOnChainFilesToOpenAIFirstRun = true;
    this.uploadOffChainFilesToOpenAIFirstRun = true;
  }

  async updateOnChainPosts() {
    cron.schedule("*/30 * * * *", async () => {
      console.log("Running scheduled task...");

      try {
        proposalTypeList.map(async (proposalType) => {
          await this.polkassemblyController._findOnChainPosts(
            proposalType,
            "All",
            "newest"
          );
          console.log(`Updated ${proposalType}-List`);
        });

        console.log("Scheduled task completed successfully.");
      } catch (err) {
        console.log("Error executing scheduled task:", err);
        throw Error("Error executing scheduled task");
      }
    });
  }

  async updateOffChainDiscussionsPosts() {
    cron.schedule("* * * * *", async () => {
      console.log("Running scheduled updateOffChainDiscussionsPosts task...");

      try {
        offChainPolkassemblyTypeList.map(async (proposalType) => {
          await this.polkassemblyController._findOffChainPosts(proposalType);

          console.log(`Updated ${proposalType}-List`);
        });

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
    });
  }

  async updateOnChainPostFolder() {
    cron.schedule("*/5 * * * *", async () => {
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
          "Scheduled updateOnChainPostFolder task completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled updateOnChainPostFolder task:",
          err
        );
        throw Error("Error executing scheduled updateOnChainPostFolder task");
      }
    });
  }

  async updateOffChainDiscussionsPostFolder() {
    cron.schedule("* * * * *", async () => {
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

            let result = {
              proposalType: proposalType,
              promises: [],
            };

            if (storedList != null && typeof storedList != "string") {
              if (storedList?.posts) {
                if (existingPostsFolderList.length === 0) {
                  result.promises = await Promise.allSettled(
                    storedList.posts.map(async (post) => {
                      await this.polkassemblyController._findOffChainPost(
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
                      } else {
                        let folderDocsJson = folderDocs + `${post.id}/docs`;
                        const completeUrls = [];

                        splitUrls.forEach((googleDocUrl) => {
                          completeUrls.push(`https${googleDocUrl}`);
                        });

                        const data = {
                          urls: [completeUrls],
                        };

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

  async uploadOnChainFilesOpenAI() {
    cron.schedule("* * * * *", async () => {
      console.log("Running scheduled uploadOnChainFilesOpenAI task...");

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

            let result = {
              proposalType: proposalType,
              promises: [],
            };

            if (storedList != null && typeof storedList != "string") {
              if (storedList?.posts) {
                if (existingPostsFolderList.length === 0) {
                  console.log("Nothing to update");
                } else if (
                  storedList?.modifiedPostsIds &&
                  storedList.modifiedPostsIds.length > 0
                ) {
                  //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                  const info = await this.openAIController._listFiles(
                    "assistants",
                    undefined,
                    "desc",
                    undefined
                  );

                  const fileIdsToBeDeleted = [];
                  storedList.modifiedPostsIds.map((postId) => {
                    info.data.map((fileData) => {
                      if (
                        fileData.filename.includes(
                          `${proposalTypeObject[proposalType]}-Id${postId}`
                        )
                      ) {
                        fileIdsToBeDeleted.push(fileData.id);
                      }
                    });
                  });

                  if (fileIdsToBeDeleted.length > 0) {
                    await Promise.allSettled(
                      fileIdsToBeDeleted.map(async (file_id) => {
                        await this.openAIController._deleteVectorStoreFile(
                          file_id
                        );
                        await this.openAIController._deleteFile(file_id);
                        await delay(500);
                      })
                    );
                  }

                  //add files to openAI
                  // result.promises = await Promise.all(
                  //   storedList.posts.map(async (post) => {
                  //     if (storedList.modifiedPostsIds.includes(post.post_id)) {
                  //       const folderKey = `OnChainPost/${proposalType}/${post.post_id}/`;
                  //       //json file

                  //       //get Json file from S3
                  //       const jsonToUpload = await this.s3Controller._s3GetFile(
                  //         folderKey + `#${post.post_id}.json`
                  //       );

                  //       //upload new Json file to OpenAI file storage
                  //       const openAIFileStorageresponse =
                  //         await this.openAIController._uploadFile(
                  //           "assistants",
                  //           jsonToUpload,
                  //           `${proposalTypeObject[proposalType]}-Id${post.post_id}.json`
                  //         );
                  //       await delay(250);

                  //       await this.openAIController._createVectorStoreFile(
                  //         openAIFileStorageresponse.id
                  //       );
                  //       await delay(250);

                  //       //doc file
                  //       const existingDocsList =
                  //         await this.s3Controller._s3ListFilesAndFolders(
                  //           "folders",
                  //           folderKey
                  //         );

                  //       if (existingDocsList.length > 0) {
                  //         await Promise.allSettled(
                  //           existingDocsList.map(async (existingDocs) => {
                  //             const docFiles =
                  //               await this.s3Controller._s3ListFilesAndFolders(
                  //                 "files",
                  //                 existingDocs
                  //               );

                  //             if (docFiles.length > 0) {
                  //               await Promise.allSettled(
                  //                 docFiles.map(async (docFileKey) => {
                  //                   const docToUpload =
                  //                     await this.s3Controller._s3GetFile(
                  //                       docFileKey
                  //                     );

                  //                   const docFileIdAndFormat = docFileKey.split(
                  //                     `OnChainPost/${proposalType}/${post.post_id}/docs/`
                  //                   )[1];

                  //                   const openAIDocFileStorageresponse =
                  //                     await this.openAIController._uploadFile(
                  //                       "assistants",
                  //                       docToUpload,
                  //                       `${proposalTypeObject[proposalType]}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                  //                     );
                  //                   await delay(250);

                  //                   await this.openAIController._createVectorStoreFile(
                  //                     openAIDocFileStorageresponse.id
                  //                   );
                  //                   await delay(250);
                  //                 })
                  //               );
                  //             }
                  //           })
                  //         );
                  //       }
                  //     }
                  //     //
                  //   })
                  // );
                }

                if (this.uploadOnChainFilesToOpenAIFirstRun) {
                  // first time running / update all
                  this.uploadOnChainFilesToOpenAIFirstRun = false;
                  //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                  const info = await this.openAIController._listFiles(
                    "assistants",
                    undefined,
                    "desc",
                    undefined
                  );

                  const fileIdsToBeDeleted = [];
                  for (let i = 0; i < info.data.length; i++) {
                    if (
                      info.data[i].filename.includes(
                        proposalTypeObject[proposalType]
                      )
                    ) {
                      fileIdsToBeDeleted.push(info.data[i].id);
                    }
                  }

                  // info.data.map((fileData) => {
                  //   if (
                  //     fileData.filename.includes(
                  //       proposalTypeObject[proposalType]
                  //     )
                  //   ) {
                  //     fileIdsToBeDeleted.push(fileData.id);
                  //   }
                  // });

                  if (fileIdsToBeDeleted.length > 0) {
                    for (let i = 0; i < fileIdsToBeDeleted.length; i++) {
                      await this.openAIController._deleteVectorStoreFile(
                        fileIdsToBeDeleted[i]
                      );
                      await this.openAIController._deleteFile(
                        fileIdsToBeDeleted[i]
                      );
                      await delay(500);
                    }
                    // await Promise.allSettled(
                    //   fileIdsToBeDeleted.map(async (file_id) => {
                    //     await this.openAIController._deleteVectorStoreFile(
                    //       file_id
                    //     );
                    //     await this.openAIController._deleteFile(file_id);
                    //     await delay(500);
                    //   })
                    // );
                  }

                  //add files to openAI
                  for (let i = 0; i < storedList.length; i++) {
                    const folderKey = `OnChainPost/${proposalType}/${storedList[i].post_id}/`;

                    //json file

                    //get Json file from S3
                    const jsonToUpload = await this.s3Controller._s3GetFile(
                      folderKey + `#${storedList[i].post_id}.json`
                    );

                    //upload new Json file to OpenAI file storage
                    const openAIFileStorageresponse =
                      await this.openAIController._uploadFile(
                        "assistants",
                        jsonToUpload,
                        `${proposalTypeObject[proposalType]}-Id${storedList[i].post_id}.json`
                      );
                    await delay(1000);

                    console.log(openAIFileStorageresponse.id);

                    await this.openAIController._createVectorStoreFile(
                      openAIFileStorageresponse.id
                    );
                    await delay(1000);

                    const existingDocsList =
                      await this.s3Controller._s3ListFilesAndFolders(
                        "folders",
                        folderKey
                      );

                    if (existingDocsList.length > 0) {
                      for (let j = 0; j < existingDocsList.length; j++) {
                        const docFiles =
                          await this.s3Controller._s3ListFilesAndFolders(
                            "files",
                            existingDocsList[j]
                          );

                        if (docFiles.length > 0) {
                          for (let k = 0; k < existingDocsList.length; k++) {
                            const docToUpload =
                              await this.s3Controller._s3GetFile(docFiles[k]);

                            const docFileIdAndFormat = docFiles[k].split(
                              `OnChainPost/${proposalType}/${storedList[i].post_id}/docs/`
                            )[1];

                            const openAIDocFileStorageresponse =
                              await this.openAIController._uploadFile(
                                "assistants",
                                docToUpload,
                                `${proposalTypeObject[proposalType]}-Id${storedList[i].post_id}-document-Id${docFileIdAndFormat}`
                              );
                            await delay(1000);

                            await this.openAIController._createVectorStoreFile(
                              openAIDocFileStorageresponse.id
                            );
                            await delay(1000);
                          }
                        }
                      }
                    }
                  }
                  // result.promises = await Promise.allSettled(
                  //   storedList.posts.map(async (post, index) => {
                  //     // const folderKey = `OnChainPost/${proposalType}/${post.post_id}/`;
                  //     // //json file
                  //     // //get Json file from S3
                  //     // const jsonToUpload = await this.s3Controller._s3GetFile(
                  //     //   folderKey + `#${post.post_id}.json`
                  //     // );
                  //     // //upload new Json file to OpenAI file storage
                  //     // const openAIFileStorageresponse =
                  //     //   await this.openAIController._uploadFile(
                  //     //     "assistants",
                  //     //     jsonToUpload,
                  //     //     `${proposalTypeObject[proposalType]}-Id${post.post_id}.json`
                  //     //   );
                  //     // await delay(1000);
                  //     // console.log(openAIFileStorageresponse.id);
                  //     // await this.openAIController._createVectorStoreFile(
                  //     //   openAIFileStorageresponse.id
                  //     // );
                  //     // await delay(1000);
                  //     //doc file
                  //     // const existingDocsList =
                  //     //   await this.s3Controller._s3ListFilesAndFolders(
                  //     //     "folders",
                  //     //     folderKey
                  //     //   );
                  //     // if (existingDocsList.length > 0) {
                  //     //   await Promise.allSettled(
                  //     //     existingDocsList.map(async (existingDocs) => {
                  //     //       const docFiles =
                  //     //         await this.s3Controller._s3ListFilesAndFolders(
                  //     //           "files",
                  //     //           existingDocs
                  //     //         );
                  //     //       if (docFiles.length > 0) {
                  //     //         await Promise.allSettled(
                  //     //           docFiles.map(async (docFileKey) => {
                  //     //             const docToUpload =
                  //     //               await this.s3Controller._s3GetFile(
                  //     //                 docFileKey
                  //     //               );
                  //     //             const docFileIdAndFormat = docFileKey.split(
                  //     //               `OnChainPost/${proposalType}/${post.post_id}/docs/`
                  //     //             )[1];
                  //     //             const openAIDocFileStorageresponse =
                  //     //               await this.openAIController._uploadFile(
                  //     //                 "assistants",
                  //     //                 docToUpload,
                  //     //                 `${proposalTypeObject[proposalType]}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                  //     //               );
                  //     //             await delay(1000);
                  //     //             await this.openAIController._createVectorStoreFile(
                  //     //               openAIDocFileStorageresponse.id
                  //     //             );
                  //     //             await delay(1000);
                  //     //           })
                  //     //         );
                  //     //       }
                  //     //     })
                  //     //   );
                  //     // }
                  //     //
                  //   })
                  // );
                }
              }
            }

            return result;
          })
        );
        console.log("allPromises: ", allPromises);

        console.log(
          "Scheduled uploadOnChainFilesOpenAI task completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled uploadOnChainFilesOpenAI task:",
          err
        );
        throw Error("Error executing scheduled uploadOnChainFilesOpenAI task");
      }
    });
  }

  async uploadOffChainFilesOpenAI() {
    cron.schedule("* * * * *", async () => {
      console.log("Running scheduled uploadOffChainFilesOpenAI task...");
      try {
        const allPromises = await Promise.allSettled(
          offChainTypeList.map(async (proposalType) => {
            let key = ``;
            let result = {
              proposalType: proposalType,
              promises: [],
            };

            if (proposalType !== "events") {
              key = `OffChainPosts/${proposalType}/${proposalType}-List.json`;
              const storedList = await this.s3Controller._s3GetFile(key);
              const existingPostsFolderList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  `OffChainPost/${proposalType}/`
                );

              if (storedList != null && typeof storedList != "string") {
                if (storedList?.posts) {
                  if (existingPostsFolderList.length === 0) {
                    console.log("Nothing to update");
                  } else if (
                    storedList?.modifiedPostsIds &&
                    storedList.modifiedPostsIds.length > 0
                  ) {
                    //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                    const info = await this.openAIController._listFiles(
                      "assistants",
                      undefined,
                      "desc",
                      undefined
                    );

                    const fileIdsToBeDeleted = [];
                    storedList.modifiedPostsIds.map((postId) => {
                      info.data.map((fileData) => {
                        if (
                          fileData.filename.includes(
                            `${proposalTypeObject[proposalType]}-Id${postId}`
                          )
                        ) {
                          fileIdsToBeDeleted.push(fileData.id);
                        }
                      });
                    });

                    if (fileIdsToBeDeleted.length > 0) {
                      await Promise.allSettled(
                        fileIdsToBeDeleted.map(async (file_id) => {
                          await this.openAIController._deleteVectorStoreFile(
                            file_id
                          );
                          await this.openAIController._deleteFile(file_id);
                          await delay(250);
                        })
                      );
                    }

                    //add files to openAI
                    // result.promises = await Promise.all(
                    //   storedList.posts.map(async (post) => {
                    //     if (
                    //       storedList.modifiedPostsIds.includes(post.post_id)
                    //     ) {
                    //       const folderKey = `OffChainPost/${proposalType}/${post.post_id}/`;
                    //       //json file

                    //       //get Json file from S3
                    //       const jsonToUpload =
                    //         await this.s3Controller._s3GetFile(
                    //           folderKey + `#${post.post_id}.json`
                    //         );

                    //       //upload new Json file to OpenAI file storage
                    //       const openAIFileStorageresponse =
                    //         await this.openAIController._uploadFile(
                    //           "assistants",
                    //           jsonToUpload,
                    //           `${proposalTypeObject[proposalType]}-Id${post.post_id}.json`
                    //         );
                    //       await delay(250);
                    //       await this.openAIController._createVectorStoreFile(
                    //         openAIFileStorageresponse.id
                    //       );
                    //       await delay(250);

                    //       //doc file
                    //       const existingDocsList =
                    //         await this.s3Controller._s3ListFilesAndFolders(
                    //           "folders",
                    //           folderKey
                    //         );

                    //       if (existingDocsList.length > 0) {
                    //         await Promise.allSettled(
                    //           existingDocsList.map(async (existingDocs) => {
                    //             const docFiles =
                    //               await this.s3Controller._s3ListFilesAndFolders(
                    //                 "files",
                    //                 existingDocs
                    //               );

                    //             if (docFiles.length > 0) {
                    //               await Promise.allSettled(
                    //                 docFiles.map(async (docFileKey) => {
                    //                   const docToUpload =
                    //                     await this.s3Controller._s3GetFile(
                    //                       docFileKey
                    //                     );

                    //                   const docFileIdAndFormat =
                    //                     docFileKey.split(
                    //                       `OnChainPost/${proposalType}/${post.post_id}/docs/`
                    //                     )[1];

                    //                   const openAIDocFileStorageresponse =
                    //                     await this.openAIController._uploadFile(
                    //                       "assistants",
                    //                       docToUpload,
                    //                       `${proposalTypeObject[proposalType]}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                    //                     );
                    //                   await delay(250);
                    //                   await this.openAIController._createVectorStoreFile(
                    //                     openAIDocFileStorageresponse.id
                    //                   );
                    //                   await delay(250);
                    //                 })
                    //               );
                    //             }
                    //           })
                    //         );
                    //       }
                    //     }
                    //     //
                    //   })
                    // );
                  } else {
                    //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                    const info = await this.openAIController._listFiles(
                      "assistants",
                      undefined,
                      "desc",
                      undefined
                    );

                    const fileIdsToBeDeleted = [];
                    info.data.map((fileData) => {
                      if (
                        fileData.filename.includes(
                          proposalTypeObject[proposalType]
                        )
                      ) {
                        fileIdsToBeDeleted.push(fileData.id);
                      }
                    });

                    if (fileIdsToBeDeleted.length > 0) {
                      await Promise.allSettled(
                        fileIdsToBeDeleted.map(async (file_id) => {
                          await this.openAIController._deleteVectorStoreFile(
                            file_id
                          );
                          await this.openAIController._deleteFile(file_id);
                          await delay(250);
                        })
                      );
                    }

                    //add files to openAI
                    // result.promises = await Promise.all(
                    //   storedList.posts.map(async (post, index) => {
                    //     const folderKey = `offChainPost/${proposalType}/${post.post_id}/`;

                    //     //json file

                    //     //get Json file from S3
                    //     const jsonToUpload = await this.s3Controller._s3GetFile(
                    //       folderKey + `#${post.post_id}.json`
                    //     );

                    //     //upload new Json file to OpenAI file storage
                    //     const openAIFileStorageresponse =
                    //       await this.openAIController._uploadFile(
                    //         "assistants",
                    //         jsonToUpload,
                    //         `${proposalTypeObject[proposalType]}-Id${post.post_id}.json`
                    //       );
                    //     await delay(250);
                    //     await this.openAIController._createVectorStoreFile(
                    //       openAIFileStorageresponse.id
                    //     );
                    //     await delay(250);

                    //     //doc file
                    //     const existingDocsList =
                    //       await this.s3Controller._s3ListFilesAndFolders(
                    //         "folders",
                    //         folderKey
                    //       );

                    //     if (existingDocsList.length > 0) {
                    //       await Promise.allSettled(
                    //         existingDocsList.map(async (existingDocs) => {
                    //           const docFiles =
                    //             await this.s3Controller._s3ListFilesAndFolders(
                    //               "files",
                    //               existingDocs
                    //             );

                    //           if (docFiles.length > 0) {
                    //             await Promise.allSettled(
                    //               docFiles.map(async (docFileKey) => {
                    //                 const docToUpload =
                    //                   await this.s3Controller._s3GetFile(
                    //                     docFileKey
                    //                   );

                    //                 const docFileIdAndFormat = docFileKey.split(
                    //                   `OffChainPost/${proposalType}/${post.post_id}/docs/`
                    //                 )[1];

                    //                 const openAIDocFileStorageresponse =
                    //                   await this.openAIController._uploadFile(
                    //                     "assistants",
                    //                     docToUpload,
                    //                     `${proposalTypeObject[proposalType]}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                    //                   );
                    //                 await delay(250);
                    //                 await this.openAIController._createVectorStoreFile(
                    //                   openAIDocFileStorageresponse.id
                    //                 );
                    //                 await delay(250);
                    //               })
                    //             );
                    //           }
                    //         })
                    //       );
                    //     }

                    //     //
                    //   })
                    // );
                  }
                }
              }
            } else {
              await eventsTypeList.map(async (eventsType) => {
                key = `OffChainPosts/${proposalType}/${eventsType}-List.json`;

                const storedList = await this.s3Controller._s3GetFile(key);
                const existingPostsFolderList =
                  await this.s3Controller._s3ListFilesAndFolders(
                    "folders",
                    `OffChainPost/${proposalType}/${eventsType}/`
                  );

                if (storedList != null && typeof storedList != "string") {
                  if (storedList?.posts) {
                    if (existingPostsFolderList.length === 0) {
                      console.log("Nothing to update");
                    } else if (
                      storedList?.modifiedPostsIds &&
                      storedList.modifiedPostsIds.length > 0
                    ) {
                      //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                      const info = await this.openAIController._listFiles(
                        "assistants",
                        undefined,
                        "desc",
                        undefined
                      );

                      const fileIdsToBeDeleted = [];
                      storedList.modifiedPostsIds.map((postId) => {
                        info.data.map((fileData) => {
                          if (
                            fileData.filename.includes(
                              `${proposalTypeObject[proposalType]}-${eventsType}-Id${postId}`
                            )
                          ) {
                            fileIdsToBeDeleted.push(fileData.id);
                          }
                        });
                      });

                      if (fileIdsToBeDeleted.length > 0) {
                        await Promise.allSettled(
                          fileIdsToBeDeleted.map(async (file_id) => {
                            await this.openAIController._deleteVectorStoreFile(
                              file_id
                            );
                            await this.openAIController._deleteFile(file_id);
                            await delay(250);
                          })
                        );
                      }

                      //add files to openAI
                      // result.promises = await Promise.all(
                      //   storedList.posts.map(async (post) => {
                      //     if (
                      //       storedList.modifiedPostsIds.includes(post.post_id)
                      //     ) {
                      //       const folderKey = `OffChainPost/${proposalType}/${eventsType}/${post.post_id}/`;
                      //       //json file

                      //       //get Json file from S3
                      //       const jsonToUpload =
                      //         await this.s3Controller._s3GetFile(
                      //           folderKey + `#${post.post_id}.json`
                      //         );

                      //       //upload new Json file to OpenAI file storage
                      //       const openAIFileStorageresponse =
                      //         await this.openAIController._uploadFile(
                      //           "assistants",
                      //           jsonToUpload,
                      //           `${proposalTypeObject[proposalType]}-${eventsType}-Id${post.post_id}.json`
                      //         );
                      //       await delay(250);
                      //       await this.openAIController._createVectorStoreFile(
                      //         openAIFileStorageresponse.id
                      //       );
                      //       await delay(250);

                      //       //doc file
                      //       const existingDocsList =
                      //         await this.s3Controller._s3ListFilesAndFolders(
                      //           "folders",
                      //           folderKey
                      //         );

                      //       if (existingDocsList.length > 0) {
                      //         await Promise.allSettled(
                      //           existingDocsList.map(async (existingDocs) => {
                      //             const docFiles =
                      //               await this.s3Controller._s3ListFilesAndFolders(
                      //                 "files",
                      //                 existingDocs
                      //               );

                      //             if (docFiles.length > 0) {
                      //               await Promise.allSettled(
                      //                 docFiles.map(async (docFileKey) => {
                      //                   const docToUpload =
                      //                     await this.s3Controller._s3GetFile(
                      //                       docFileKey
                      //                     );

                      //                   const docFileIdAndFormat =
                      //                     docFileKey.split(
                      //                       `OffChainPost/${proposalType}/${eventsType}/${post.post_id}/docs/`
                      //                     )[1];

                      //                   const openAIDocFileStorageresponse =
                      //                     await this.openAIController._uploadFile(
                      //                       "assistants",
                      //                       docToUpload,
                      //                       `${proposalTypeObject[proposalType]}-${eventsType}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                      //                     );
                      //                   await delay(250);
                      //                   await this.openAIController._createVectorStoreFile(
                      //                     openAIDocFileStorageresponse.id
                      //                   );
                      //                   await delay(250);
                      //                 })
                      //               );
                      //             }
                      //           })
                      //         );
                      //       }
                      //     }
                      //     //
                      //   })
                      // );
                    } else {
                      //delete the old Json file from OpenAI file storage and OpenAI Vecto Store

                      const info = await this.openAIController._listFiles(
                        "assistants",
                        undefined,
                        "desc",
                        undefined
                      );

                      const fileIdsToBeDeleted = [];
                      info.data.map((fileData) => {
                        if (
                          fileData.filename.includes(
                            `${proposalTypeObject[proposalType]}-${eventsType}`
                          )
                        ) {
                          fileIdsToBeDeleted.push(fileData.id);
                        }
                      });

                      if (fileIdsToBeDeleted.length > 0) {
                        await Promise.allSettled(
                          fileIdsToBeDeleted.map(async (file_id) => {
                            await this.openAIController._deleteVectorStoreFile(
                              file_id
                            );
                            await this.openAIController._deleteFile(file_id);
                            await delay(250);
                          })
                        );
                      }

                      //add files to openAI
                      // result.promises = await Promise.all(
                      //   storedList.posts.map(async (post) => {
                      //     if (
                      //       storedList.modifiedPostsIds.includes(post.post_id)
                      //     ) {
                      //       const folderKey = `OffChainPost/${proposalType}/${eventsType}/${post.post_id}/`;
                      //       //json file

                      //       //get Json file from S3
                      //       const jsonToUpload =
                      //         await this.s3Controller._s3GetFile(
                      //           folderKey + `#${post.post_id}.json`
                      //         );

                      //       //upload new Json file to OpenAI file storage
                      //       const openAIFileStorageresponse =
                      //         await this.openAIController._uploadFile(
                      //           "assistants",
                      //           jsonToUpload,
                      //           `${proposalTypeObject[proposalType]}-${eventsType}-Id${post.post_id}.json`
                      //         );
                      //       await delay(250);
                      //       await this.openAIController._createVectorStoreFile(
                      //         openAIFileStorageresponse.id
                      //       );
                      //       await delay(250);

                      //       //doc file
                      //       const existingDocsList =
                      //         await this.s3Controller._s3ListFilesAndFolders(
                      //           "folders",
                      //           folderKey
                      //         );

                      //       if (existingDocsList.length > 0) {
                      //         await Promise.allSettled(
                      //           existingDocsList.map(async (existingDocs) => {
                      //             const docFiles =
                      //               await this.s3Controller._s3ListFilesAndFolders(
                      //                 "files",
                      //                 existingDocs
                      //               );

                      //             if (docFiles.length > 0) {
                      //               await Promise.allSettled(
                      //                 docFiles.map(async (docFileKey) => {
                      //                   const docToUpload =
                      //                     await this.s3Controller._s3GetFile(
                      //                       docFileKey
                      //                     );

                      //                   const docFileIdAndFormat =
                      //                     docFileKey.split(
                      //                       `OffChainPost/${proposalType}/${eventsType}/${post.post_id}/docs/`
                      //                     )[1];

                      //                   const openAIDocFileStorageresponse =
                      //                     await this.openAIController._uploadFile(
                      //                       "assistants",
                      //                       docToUpload,
                      //                       `${proposalTypeObject[proposalType]}-${eventsType}-Id${post.post_id}-document-Id${docFileIdAndFormat}`
                      //                     );
                      //                   await delay(250);

                      //                   await this.openAIController._createVectorStoreFile(
                      //                     openAIDocFileStorageresponse.id
                      //                   );
                      //                   await delay(250);
                      //                 })
                      //               );
                      //             }
                      //           })
                      //         );
                      //       }
                      //     }
                      //     //
                      //   })
                      // );
                    }
                  }
                }
              });
            }

            return result;
          })
        );

        console.log("allPromises: ", allPromises);

        console.log(
          "Scheduled uploadOnChainFilesOpenAI task completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled uploadOffChainFilesOpenAI task:",
          err
        );
        throw Error("Error executing scheduled uploadOffChainFilesOpenAI task");
      }
    });
  }
}
