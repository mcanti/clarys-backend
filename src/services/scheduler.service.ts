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
  onChainProposalTypeList,
  offChainProposalTypeList,
} from "../constants/proposalTypes";

import {
  findFiledId,
  findGoogleDocsLinks,
} from "../helpers/googleDocsLinksFinder.helper";
import { delay } from "../helpers/utilsFunctions.helper";
import {
  findGoogleDriveDocsLinks,
  extractFolderId,
} from "../helpers/googleDriveDocsLinksFinder.helper";

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

  //List Schedulers

  async updateOnChainPosts() {
    cron.schedule("*/6 * * *", async () => {
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
    });
  }

  async updateOffChainDiscussionsPosts() {
    cron.schedule("*/1 * * *", async () => {
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
    });
  }

  async updateOffChainEventsPosts() {
    cron.schedule("*/1 * * *", async () => {
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
    });
  }

  async updateOffChainMeetUpEventsPosts() {
    cron.schedule("*/1 * * *", async () => {
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
        throw Error(
          "Error executing scheduled updateOffChainMeetUpEventsPosts task"
        );
      }
    });
  }

  //Folder Objects and Files Schedulers

  async updateOnChainPostFolder() {
    cron.schedule("*/10 * * *", async () => {
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
                } else if (
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
    });
  }

  async updateOffChainDiscussionsPostFolder() {
    cron.schedule("*/2 * * *", async () => {
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
                } else if (
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
    });
  }

  async updateOffChainEventsAndSubEventsPostFolder() {
    cron.schedule("*/2 * * *", async () => {
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
                      const result =
                        await this.awsStorageService.uploadFilesToS3(
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
                      const result =
                        await this.awsStorageService.uploadFilesToS3(
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
    });
  }

  async updateOffChainMeetUpEventsPostFolder() {
    cron.schedule("*/2 * * *", async () => {
      console.log(
        "Running scheduled updateOffChainMeetUpEventsPostFolder task ..."
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
            console.log("Existing Data");

            if (
              storedList?.modifiedPostsIds &&
              storedList.modifiedPostsIds.length > 0
            ) {
              console.log("Updating changed data");

              await Promise.allSettled(
                storedList.modifiedPostsIds.map(async (id) => {
                  storedList.posts(async (post, index) => {
                    if (post.id === id) {
                      const splitUrls = [];

                      if (post.proposalFolderlLink !== "") {
                        const proposalLinks = post.proposalFolderlLink
                          .split("https")
                          .filter((part) => part !== "");

                        proposalLinks.forEach((link) => {
                          splitUrls.push(`https${link}`);
                        });
                      }

                      if (post.reportFolderLink !== "") {
                        const reportLinks = post.reportFolderLink
                          .split("https")
                          .filter((part) => part !== "");

                        reportLinks.forEach((link) => {
                          splitUrls.push(`https${link}`);
                        });
                      }

                      for (
                        let splitUrlsIndex = 0;
                        splitUrlsIndex < splitUrls.length;
                        splitUrlsIndex++
                      ) {
                        const filesIds = [];
                        const googleDocsMatches = findGoogleDocsLinks(
                          splitUrls[splitUrlsIndex]
                        );

                        if (googleDocsMatches.length > 0) {
                          googleDocsMatches.forEach((googleDocUrl) => {
                            const fieldId = findFiledId(googleDocUrl);
                            if (!fieldId) {
                              console.log("Invalid Google Docs URL provided.");
                            } else {
                              filesIds.push(fieldId);
                            }
                          });
                        }

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
                          const folderId = extractFolderId(
                            splitUrls[splitUrlsIndex]
                          );

                          await this.googleService.processFilesFromFolder(
                            folderId,
                            `${folderDocs}${post.id}/docs/`
                          );
                        } else {
                          let folderDocsJson = folderDocs + `${post.id}/docs`;
                          const completeUrls = [];
                          completeUrls.push(splitUrls[splitUrlsIndex]);

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
                      }

                      const buffer = Buffer.from(JSON.stringify(post));

                      let folderJson = folder + `${post.id}`;
                      await this.awsStorageService.uploadFilesToS3(
                        buffer,
                        `${folderJson}/#${post.id}.json`,
                        "application/json"
                      );
                    }
                  });
                })
              );
            } else if (
              existingMeetUpsEventsPostsFolderList === null ||
              (existingMeetUpsEventsPostsFolderList &&
                existingMeetUpsEventsPostsFolderList.length === 0)
            ) {
              console.log("Updating all data");
              await Promise.allSettled(
                storedList.posts.map(async (post) => {
                  const splitUrls = [];

                  if (post.proposalFolderlLink !== "") {
                    const proposalLinks = post.proposalFolderlLink
                      .split("https")
                      .filter((part) => part !== "");

                    proposalLinks.forEach((link) => {
                      splitUrls.push(`https${link}`);
                    });
                  }

                  if (post.reportFolderLink !== "") {
                    const reportLinks = post.reportFolderLink
                      .split("https")
                      .filter((part) => part !== "");

                    reportLinks.forEach((link) => {
                      splitUrls.push(`https${link}`);
                    });
                  }

                  for (
                    let splitUrlsIndex = 0;
                    splitUrlsIndex < splitUrls.length;
                    splitUrlsIndex++
                  ) {
                    const filesIds = [];
                    const googleDocsMatches = findGoogleDocsLinks(
                      splitUrls[splitUrlsIndex]
                    );

                    if (googleDocsMatches.length > 0) {
                      googleDocsMatches.forEach((googleDocUrl) => {
                        const fieldId = findFiledId(googleDocUrl);
                        if (!fieldId) {
                          console.log("Invalid Google Docs URL provided.");
                        } else {
                          filesIds.push(fieldId);
                        }
                      });
                    }

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
                        await Promise.allSettled(
                          filesIds.map(async (fileId) => {
                            await this.googleService.uploadGoogleDocToS3(
                              fileId,
                              folderDocsFile
                            );
                          })
                        );
                      }
                      const folderId = extractFolderId(
                        splitUrls[splitUrlsIndex]
                      );

                      await this.googleService.processFilesFromFolder(
                        folderId,
                        `${folderDocs}${post.id}/docs/`
                      );
                    } else {
                      let folderDocsJson = folderDocs + `${post.id}/docs`;
                      const completeUrls = [];
                      completeUrls.push(splitUrls[splitUrlsIndex]);

                      const data = {
                        urls: completeUrls,
                      };

                      const buffer = Buffer.from(JSON.stringify(data));
                      await this.awsStorageService.uploadFilesToS3(
                        buffer,
                        `${folderDocsJson}/docs_urls.json`,
                        "application/json"
                      );
                    }
                  }

                  const buffer = Buffer.from(JSON.stringify(post));

                  let folderJson = folder + `${post.id}`;
                  await this.awsStorageService.uploadFilesToS3(
                    buffer,
                    `${folderJson}/#${post.id}.json`,
                    "application/json"
                  );
                })
              );
            }
          }
        }

        console.log(
          "Scheduled task updateOffChainMeetUpEventsPostFolder completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled updateOffChainMeetUpEventsPostFolder task:",
          err
        );
        throw Error(
          "Error executing scheduled updateOffChainMeetUpEventsPostFolder task"
        );
      }
    });
  }

  //OPEN AI

  async updateOnChainDataToVectorStore() {
    cron.schedule("*/12 * * *", async () => {
    console.log("Running scheduled task: updateOnChainDataToVectorStore ...");
    try {
      let keysAndNames = [];
      for (const proposalType of onChainProposalTypeList) {
        const listFileKey = `OnChainPosts/${proposalType}/${proposalType}-List.json`;
        keysAndNames.push({
          key: listFileKey,
          name: `${proposalType}-List.json`,
        });

        const proposalsListResponse = await this.s3Controller._s3GetFile(
          listFileKey
        );

        const folderKey = `OnChainPost/${proposalType}/`;

        const filteredFolderList = [];

        if (this.firstRun) {
          //geting the folders for all proposals
          // console.log("geting the folders for all proposals");
          const foldersList = await this.s3Controller._s3ListFilesAndFolders(
            "folders",
            folderKey
          );

          if (foldersList) {
            filteredFolderList.push(...foldersList);
          }
        } else if (
          proposalsListResponse &&
          proposalsListResponse.modifiedPostsIds &&
          proposalsListResponse.modifiedPostsIds.length > 0
        ) {
          //geting only the folders for modified ids
          // console.log("geting only the folders for modified proposals ids");
          const allVectorStoreFiles =
            await this.openAIController._listAllVectorStoreFiles();
          const vectorStoreFilesToBeDeleted = [];

          for (const id of proposalsListResponse.modifiedPostsIds) {
            for (const vectorFile of allVectorStoreFiles) {
              const openAIFile = await this.openAIController._getFile(
                vectorFile.id
              );
              if (openAIFile.filename.includes(`${proposalType}-Id${id}`)) {
                vectorStoreFilesToBeDeleted.push(openAIFile);
              }
            }
            filteredFolderList.push(`${folderKey}${id}/`);
          }

          for (const file of vectorStoreFilesToBeDeleted) {
            await this.openAIController._deleteVectorStoreFile(file.id);
          }
        }

        for (const folder of filteredFolderList) {
          // console.log("searching in folder:", folder);

          const filesList = await this.s3Controller._s3ListFilesAndFolders(
            "files",
            folder
          );

          // console.log(filesList);

          if (filesList && filesList.length > 0) {
            filesList.forEach((file) => {
              keysAndNames.push({
                key: file,
                name: `${proposalType}-Id${
                  folder.split("/").slice(-2)[0]
                }-${file.split("/").slice(-1)}`,
              });
            });
          }

          const docsFolderList = await this.s3Controller._s3ListFilesAndFolders(
            "folders",
            folder
          );

          if (docsFolderList.length > 0) {
            for (const docsFolder of docsFolderList) {
              const docFilesList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "files",
                  docsFolder
                );

              if (docFilesList && docFilesList.length > 0) {
                docFilesList.forEach((docFiles) => {
                  keysAndNames.push({
                    key: docFiles,
                    name: `${proposalType}-Id${
                      folder.split("/").slice(-2)[0]
                    }-${docFiles.split("/").slice(-1)}`,
                  });
                });
              }
            }
          }
        }
      }

      await this.openAIController._uploadFilesToOpenAIVectorStore(keysAndNames);

      console.log(
        "Scheduled task: updateOnChainDataToVectorStore completed successfully."
      );
    } catch (err) {
      console.log(
        "Error executing scheduled updateOnChainDataToVectorStore task:",
        err
      );
    }
    });
  }

  async updateOffChainDataToVectorStore() {
    cron.schedule("*/4 * * *", async () => {
      console.log(
        "Running scheduled task: updateOffChainDataToVectorStore ..."
      );
      try {
        for (const proposalType of offChainProposalTypeList) {
          let keysAndNames = [];
          let listFileKey;
          if (proposalType === "events") {
            const listFileKey = [
              `OffChainPosts/${proposalType}/${proposalType}-List.json`,
              `OffChainPosts/${proposalType}/subEvents-List.json`,
            ];
            keysAndNames.push(
              {
                key: listFileKey[0],
                name: `${proposalType}-List.json`,
              },
              {
                key: listFileKey[1],
                name: `subEvents-List.json`,
              }
            );

            const proposalsEventsListResponse =
              await this.s3Controller._s3GetFile(listFileKey[0]);

            const proposalsSubEventsListResponse =
              await this.s3Controller._s3GetFile(listFileKey[1]);

            const folderEventsKey = `OffChainPost/${proposalType}/events/`;
            const folderSubEventsKey = `OffChainPost/${proposalType}/subEvents/`;

            const filteredEventsFolderList = [];
            const filteredSubEventsFolderList = [];

            if (this.firstRun) {
              //geting the folders for all proposals
              // console.log("geting the folders for all proposals");
              const foldersList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folderEventsKey
                );

              if (foldersList) {
                filteredEventsFolderList.push(...foldersList);
              }
            } else if (
              proposalsEventsListResponse &&
              proposalsEventsListResponse?.modifiedPostsIds &&
              proposalsEventsListResponse?.modifiedPostsIds.length > 0
            ) {
              //geting only the folders for modified ids
              // console.log("geting only the folders for modified proposals ids");

              const allVectorStoreFiles =
                await this.openAIController._listAllVectorStoreFiles();
              const vectorStoreFilesToBeDeleted = [];

              for (const id of proposalsEventsListResponse.modifiedPostsIds) {
                for (const vectorFile of allVectorStoreFiles) {
                  const openAIFile = await this.openAIController._getFile(
                    vectorFile.id
                  );
                  if (openAIFile.filename.includes(`${proposalType}-Id${id}`)) {
                    vectorStoreFilesToBeDeleted.push(openAIFile);
                  }
                }
                filteredEventsFolderList.push(`${folderEventsKey}${id}/`);
              }

              for (const file of vectorStoreFilesToBeDeleted) {
                await this.openAIController._deleteVectorStoreFile(file.id);
              }
            }

            for (const folder of filteredEventsFolderList) {
              // console.log("searching in folder:", folder);

              const filesList = await this.s3Controller._s3ListFilesAndFolders(
                "files",
                folder
              );

              // console.log(filesList);

              if (filesList && filesList.length > 0) {
                filesList.forEach((file) => {
                  keysAndNames.push({
                    key: file,
                    name: `${proposalType}-Id${
                      folder.split("/").slice(-2)[0]
                    }-${file.split("/").slice(-1)}`,
                  });
                });
              }

              const docsFolderList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folder
                );

              if (docsFolderList.length > 0) {
                for (const docsFolder of docsFolderList) {
                  const docFilesList =
                    await this.s3Controller._s3ListFilesAndFolders(
                      "files",
                      docsFolder
                    );

                  if (docFilesList && docFilesList.length > 0) {
                    docFilesList.forEach((docFiles) => {
                      keysAndNames.push({
                        key: docFiles,
                        name: `${proposalType}-Id${
                          folder.split("/").slice(-2)[0]
                        }-${docFiles.split("/").slice(-1)}`,
                      });
                    });
                  }
                }
              }
            }

            if (this.firstRun) {
              //geting the folders for all proposals
              // console.log("geting the folders for all proposals");
              const foldersList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folderSubEventsKey
                );

              if (foldersList) {
                filteredSubEventsFolderList.push(...foldersList);
              }
            }else if (
              proposalsSubEventsListResponse &&
              proposalsSubEventsListResponse?.modifiedPostsIds &&
              proposalsSubEventsListResponse?.modifiedPostsIds.length > 0
            ) {
              //geting only the folders for modified ids
              // console.log("geting only the folders for modified proposals ids");

              for (const id of proposalsSubEventsListResponse.modifiedPostsIds) {
                filteredSubEventsFolderList.push(`${folderSubEventsKey}${id}/`);
              }

              const allVectorStoreFiles =
                await this.openAIController._listAllVectorStoreFiles();
              const vectorStoreFilesToBeDeleted = [];

              for (const id of proposalsSubEventsListResponse.modifiedPostsIds) {
                for (const vectorFile of allVectorStoreFiles) {
                  const openAIFile = await this.openAIController._getFile(
                    vectorFile.id
                  );
                  if (openAIFile.filename.includes(`subEvent-Id${id}`)) {
                    vectorStoreFilesToBeDeleted.push(openAIFile);
                  }
                }
                filteredSubEventsFolderList.push(`${folderSubEventsKey}${id}/`);
              }

              for (const file of vectorStoreFilesToBeDeleted) {
                await this.openAIController._deleteVectorStoreFile(file.id);
              }
            } 
            

            for (const folder of filteredSubEventsFolderList) {
              // console.log("searching in folder:", folder);

              const filesList = await this.s3Controller._s3ListFilesAndFolders(
                "files",
                folder
              );

              // console.log(filesList);

              if (filesList && filesList.length > 0) {
                filesList.forEach((file) => {
                  keysAndNames.push({
                    key: file,
                    name: `subEvent-Id${folder.split("/").slice(-2)[0]}-${file
                      .split("/")
                      .slice(-1)}`,
                  });
                });
              }

              const docsFolderList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folder
                );

              if (docsFolderList.length > 0) {
                for (const docsFolder of docsFolderList) {
                  const docFilesList =
                    await this.s3Controller._s3ListFilesAndFolders(
                      "files",
                      docsFolder
                    );

                  if (docFilesList && docFilesList.length > 0) {
                    docFilesList.forEach((docFiles) => {
                      keysAndNames.push({
                        key: docFiles,
                        name: `subEvent-Id${
                          folder.split("/").slice(-2)[0]
                        }-${docFiles.split("/").slice(-1)}`,
                      });
                    });
                  }
                }
              }
            }
          } else {
            listFileKey = `OffChainPosts/${proposalType}/${proposalType}-List.json`;
            keysAndNames.push({
              key: listFileKey,
              name: `${proposalType}-List.json`,
            });

            const proposalsListResponse = await this.s3Controller._s3GetFile(
              listFileKey
            );

            const folderKey = `OffChainPost/${proposalType}/`;

            const filteredFolderList = [];

            if (this.firstRun) {
              //geting the folders for all proposals
              // console.log("geting the folders for all proposals");
              const foldersList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folderKey
                );

              if (foldersList) {
                filteredFolderList.push(...foldersList);
              }
            } else if (
              proposalsListResponse &&
              proposalsListResponse.modifiedPostsIds &&
              proposalsListResponse.modifiedPostsIds.length > 0
            ) {
              //geting only the folders for modified ids
              // console.log("geting only the folders for modified proposals ids");

              const allVectorStoreFiles =
                await this.openAIController._listAllVectorStoreFiles();
              const vectorStoreFilesToBeDeleted = [];

              for (const id of proposalsListResponse.modifiedPostsIds) {
                for (const vectorFile of allVectorStoreFiles) {
                  const openAIFile = await this.openAIController._getFile(
                    vectorFile.id
                  );
                  if (openAIFile.filename.includes(`${proposalType}-Id${id}`)) {
                    vectorStoreFilesToBeDeleted.push(openAIFile);
                  }
                }
                filteredFolderList.push(`${folderKey}${id}/`);
              }

              for (const file of vectorStoreFilesToBeDeleted) {
                await this.openAIController._deleteVectorStoreFile(file.id);
              }
            }

            for (const folder of filteredFolderList) {
              // console.log("searching in folder:", folder);

              const filesList = await this.s3Controller._s3ListFilesAndFolders(
                "files",
                folder
              );

              // console.log(filesList);

              if (filesList && filesList.length > 0) {
                filesList.forEach((file) => {
                  keysAndNames.push({
                    key: file,
                    name: `${proposalType}-Id${
                      folder.split("/").slice(-2)[0]
                    }-${file.split("/").slice(-1)}`,
                  });
                });
              }

              const docsFolderList =
                await this.s3Controller._s3ListFilesAndFolders(
                  "folders",
                  folder
                );

              if (docsFolderList.length > 0) {
                for (const docsFolder of docsFolderList) {
                  const docFilesList =
                    await this.s3Controller._s3ListFilesAndFolders(
                      "files",
                      docsFolder
                    );

                  if (docFilesList && docFilesList.length > 0) {
                    docFilesList.forEach((docFiles) => {
                      keysAndNames.push({
                        key: docFiles,
                        name: `${proposalType}-Id${
                          folder.split("/").slice(-2)[0]
                        }-${docFiles.split("/").slice(-1)}`,
                      });
                    });
                  }
                }
              }
            }
          }

          await this.openAIController._uploadFilesToOpenAIVectorStore(
            keysAndNames
          );
        }

        console.log(
          "Scheduled task: updateOffChainDataToVectorStore completed successfully."
        );
      } catch (err) {
        console.log(
          "Error executing scheduled updateOffChainDataToVectorStore task:",
          err
        );
      }
    });
  }
}
