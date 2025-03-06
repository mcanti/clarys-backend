import { eventsTypeList, offChainPolkassemblyTypeList, offChainProposalTypeList, onChainProposalTypeList, proposalTypeList } from "../../constants/proposalTypes";
import { SchedulerService } from "../../services/scheduler.service";
import cron from "node-cron";

jest.mock("node-cron", () => ({
  schedule: jest.fn((cronTime, callback) => {
    return {
      start: jest.fn(),
    };
  }),
}));

describe("SchedulerService", () => {
  let schedulerService;
  let mockAwsStorageService;
  let mockFileService;
  let mockGoogleService;
  let mockPolkassemblyController;
  let mockDotEventsController;
  let mockDotMeetUpsController;
  let mockS3Controller;
  let mockOpenAIController;
  let mockDynamoDBController;

  beforeEach(() => {
    mockAwsStorageService = { uploadFilesToS3: jest.fn() };
    mockFileService = { saveDataToFile: jest.fn() };
    mockGoogleService = { uploadGoogleDocToS3: jest.fn(), processFilesFromFolder: jest.fn() };
    mockPolkassemblyController = {
      _findOnChainPosts: jest.fn(),
      _findOffChainPosts: jest.fn(),
      _findOnChainPost: jest.fn(),
      _findOffChainPost: jest.fn(),
    };
    mockDotEventsController = { _findSubmissionsEvents: jest.fn() };
    mockDotMeetUpsController = { _findMeetUpEvents: jest.fn() };
    mockS3Controller = { _s3GetFile: jest.fn(), _s3ListFilesAndFolders: jest.fn() };
    mockOpenAIController = { _uploadFilesToOpenAIVectorStore: jest.fn() };
    mockDynamoDBController = { _updateDataToDynamoDBTable: jest.fn() };

    process.env.FIRST_RUN = "true";

    schedulerService = new SchedulerService(
      mockAwsStorageService,
      mockFileService,
      mockGoogleService,
      mockPolkassemblyController,
      mockDotEventsController,
      mockDotMeetUpsController,
      mockS3Controller,
      mockOpenAIController,
      mockDynamoDBController
    );
  });

  it("should schedule updateOnChainPosts task", async () => {
    await schedulerService.updateOnChainPosts();
    expect(cron.schedule).toHaveBeenCalledWith("0 */6 * * *", expect.any(Function));
  });

  it("should schedule updateOffChainDiscussionsPosts task", async () => {
    await schedulerService.updateOffChainDiscussionsPosts();
    expect(cron.schedule).toHaveBeenCalledWith("0 */1 * * *", expect.any(Function));
  });

  it("should schedule updateOffChainEventsPosts task", async () => {
    await schedulerService.updateOffChainEventsPosts();
    expect(cron.schedule).toHaveBeenCalledWith("0 */1 * * *", expect.any(Function));
  });

  it("should schedule updateOffChainMeetUpEventsPosts task", async () => {
    await schedulerService.updateOffChainMeetUpEventsPosts();
    expect(cron.schedule).toHaveBeenCalledWith("0 */1 * * *", expect.any(Function));
  });

  it("should schedule updateOnChainDataToVectorStore task", async () => {
    await schedulerService.updateOnChainDataToVectorStore();
    expect(cron.schedule).toHaveBeenCalledWith("0 */4 * * *", expect.any(Function));
  });

  it("should schedule updateOffChainDataToVectorStore task", async () => {
    await schedulerService.updateOffChainDataToVectorStore();
    expect(cron.schedule).toHaveBeenCalledWith("0 */4 * * *", expect.any(Function));
  });

  it("should schedule updateDynamoDb task", async () => {
    await schedulerService.updateDynamoDb();
    expect(cron.schedule).toHaveBeenCalledWith("0 */7 * * *", expect.any(Function));
  });

  it("should execute updateOnChainPosts task correctly", async () => {
    const mockFindOnChainPosts = jest.fn().mockResolvedValue(undefined);
    mockPolkassemblyController._findOnChainPosts = mockFindOnChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPosts();
    await scheduledCallback();
  
    expect(mockFindOnChainPosts).toHaveBeenCalledTimes(proposalTypeList.length);
    proposalTypeList.forEach((type) => {
      expect(mockFindOnChainPosts).toHaveBeenCalledWith(type, "All", "newest");
    });
  });
  

  it("should log an error if updateOnChainPosts fails", async () => {
    const mockFindOnChainPosts = jest.fn().mockRejectedValue(new Error("API Error"));
    mockPolkassemblyController._findOnChainPosts = mockFindOnChainPosts;
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPosts();
  
    // Run the scheduled function manually and expect it to fail
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });
  

  it("should execute updateOffChainDiscussionsPosts correctly", async () => {
    const mockFindOffChainPosts = jest.fn().mockResolvedValue(undefined);
    mockPolkassemblyController._findOffChainPosts = mockFindOffChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPosts();
    await scheduledCallback();
  
    expect(mockFindOffChainPosts).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    offChainPolkassemblyTypeList.forEach((type) => {
      expect(mockFindOffChainPosts).toHaveBeenCalledWith(type);
    });
  });
  
  it("should log an error if updateOffChainDiscussionsPosts fails", async () => {
    const mockFindOffChainPosts = jest.fn().mockRejectedValue(new Error("API Error"));
    mockPolkassemblyController._findOffChainPosts = mockFindOffChainPosts;
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPosts();
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateOffChainDiscussionsPosts task");
  
    expect(consoleSpy).toHaveBeenCalledWith("Error executing scheduled updateOffChainDiscussionsPosts task:", expect.any(Error));
    consoleSpy.mockRestore();
  });
  
  it("should execute updateDynamoDb correctly", async () => {
    const mockUpdateDynamoDb = jest.fn().mockResolvedValue(undefined);
    mockDynamoDBController._updateDataToDynamoDBTable = mockUpdateDynamoDb;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateDynamoDb();
    await scheduledCallback();
  
    expect(mockUpdateDynamoDb).toHaveBeenCalled();
  });
  
  it("should log an error if updateDynamoDb fails", async () => {
    const mockUpdateDynamoDb = jest.fn().mockRejectedValue(new Error("DynamoDB Error"));
    mockDynamoDBController._updateDataToDynamoDBTable = mockUpdateDynamoDb;
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateDynamoDb();
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateDynamoDb task");
  
    expect(consoleSpy).toHaveBeenCalledWith("Error executing scheduled updateDynamoDb task:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("should execute updateOnChainDataToVectorStore correctly", async () => {
    const mockUploadToVectorStore = jest.fn().mockResolvedValue(undefined);
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockUploadToVectorStore;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainDataToVectorStore();
    await scheduledCallback();
  
    expect(mockUploadToVectorStore).toHaveBeenCalled();
  });
  
  it("should log an error if updateOnChainDataToVectorStore fails", async () => {
    const mockUploadToVectorStore = jest.fn().mockRejectedValue(new Error("OpenAI API Error"));
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockUploadToVectorStore;
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainDataToVectorStore();
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateOnChainDataToVectorStore task");
  
    expect(consoleSpy).toHaveBeenCalledWith("Error executing scheduled updateOnChainDataToVectorStore task:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("should execute updateOffChainDiscussionsPosts task correctly", async () => {
    const mockFindOffChainPosts = jest.fn().mockResolvedValue(undefined);
    mockPolkassemblyController._findOffChainPosts = mockFindOffChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPosts();
    await scheduledCallback();
  
    expect(mockFindOffChainPosts).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    offChainPolkassemblyTypeList.forEach((type) => {
      expect(mockFindOffChainPosts).toHaveBeenCalledWith(type);
    });
  });
  
  it("should execute updateOffChainEventsPosts task correctly", async () => {
    const mockFindSubmissionsEvents = jest.fn().mockResolvedValue(undefined);
    mockDotEventsController._findSubmissionsEvents = mockFindSubmissionsEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainEventsPosts();
    await scheduledCallback();
  
    expect(mockFindSubmissionsEvents).toHaveBeenCalledTimes(1);
  });
  
  it("should execute updateOffChainMeetUpEventsPosts task correctly", async () => {
    const mockFindMeetUpEvents = jest.fn().mockResolvedValue(undefined);
    mockDotMeetUpsController._findMeetUpEvents = mockFindMeetUpEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainMeetUpEventsPosts();
    await scheduledCallback();
  
    expect(mockFindMeetUpEvents).toHaveBeenCalledTimes(1);
  });
  
  it("should execute updateOnChainPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({ posts: [{ post_id: "123" }] });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockFindOnChainPost = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockPolkassemblyController._findOnChainPost = mockFindOnChainPost;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockFindOnChainPost).toHaveBeenCalledWith(expect.any(String), "123");
  });

  it("should execute updateOffChainDiscussionsPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({ posts: [{ post_id: "456" }] });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockFindOffChainPost = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockPolkassemblyController._findOffChainPost = mockFindOffChainPost;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    expect(mockFindOffChainPost).toHaveBeenCalledWith(expect.any(String), "456");
  });
  
  it("should execute updateOffChainEventsAndSubEventsPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({ posts: [{ id: "789" }] });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockAwsUploadFilesToS3 = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockAwsStorageService.uploadFilesToS3 = mockAwsUploadFilesToS3;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainEventsAndSubEventsPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(eventsTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(2);
    expect(mockAwsUploadFilesToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("/docs_urls.json"),
      "application/json"
    );
  });  

  it("should execute updateOffChainMeetUpEventsPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [
        {
          id: "meetup123",
          status: "Accepted", // Ensure status matches the function's logic
          proposalFolderlLink: "https://drive.google.com/folderview?id=12345",
          reportFolderLink: "https://drive.google.com/folderview?id=67890",
        },
      ],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue(null); // Simulate no existing folders
    const mockAwsUploadFilesToS3 = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockAwsStorageService.uploadFilesToS3 = mockAwsUploadFilesToS3;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainMeetUpEventsPostFolder();
    await scheduledCallback();
  
    console.log("Final call count:", mockAwsUploadFilesToS3.mock.calls.length);
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(1);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(1);
    expect(mockAwsUploadFilesToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("/docs_urls.json"),
      "application/json"
    );
  });  
    
  it("should execute updateOnChainPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ post_id: "post123" }],
      modifiedPostsIds: ["post123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockFindOnChainPost = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockPolkassemblyController._findOnChainPost = mockFindOnChainPost;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockFindOnChainPost).toHaveBeenCalledWith(expect.any(String), "post123");
  });
  
  it("should execute updateOffChainDiscussionsPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ post_id: "discussion123" }],
      modifiedPostsIds: ["discussion123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockFindOffChainPost = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockPolkassemblyController._findOffChainPost = mockFindOffChainPost;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    expect(mockFindOffChainPost).toHaveBeenCalledWith(expect.any(String), "discussion123");
  });
  
  it("should execute updateOffChainEventsAndSubEventsPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ id: "event123" }],
      modifiedPostsIds: ["event123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockAwsUploadFilesToS3 = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockAwsStorageService.uploadFilesToS3 = mockAwsUploadFilesToS3;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainEventsAndSubEventsPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(eventsTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(eventsTypeList.length);
    expect(mockAwsUploadFilesToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("/docs_urls.json"),
      "application/json"
    );
  });

  it("should execute updateOnChainDataToVectorStore task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      modifiedPostsIds: ["post123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue(["OnChainPost/type123/post123/"]);
    const mockOpenAIUploadFiles = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockOpenAIUploadFiles;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainDataToVectorStore();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(onChainProposalTypeList.length);
    expect(mockS3ListFilesAndFolders.mock.calls.length).toBeGreaterThanOrEqual(onChainProposalTypeList.length);
    expect(mockOpenAIUploadFiles).toHaveBeenCalledWith(expect.any(Array));
  });
  
  it("should execute updateOffChainDataToVectorStore task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      modifiedPostsIds: ["post123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue(["OffChainPost/type123/post123/"]);
    const mockOpenAIUploadFiles = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockOpenAIUploadFiles;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDataToVectorStore();
    await scheduledCallback();
  
    expect(mockS3GetFile.mock.calls.length).toBeGreaterThanOrEqual(offChainProposalTypeList.length);
    expect(mockS3ListFilesAndFolders.mock.calls.length).toBeGreaterThanOrEqual(offChainProposalTypeList.length);
    expect(mockOpenAIUploadFiles).toHaveBeenCalledWith(expect.any(Array));
  });
  
  it("should execute updateDynamoDb task correctly", async () => {
    const mockUpdateDynamoDb = jest.fn().mockResolvedValue(undefined);
    mockDynamoDBController._updateDataToDynamoDBTable = mockUpdateDynamoDb;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateDynamoDb();
    await scheduledCallback();
  
    expect(mockUpdateDynamoDb).toHaveBeenCalledTimes(1);
  });
  
  it("should log an error if updateDynamoDb fails", async () => {
    const mockUpdateDynamoDb = jest.fn().mockRejectedValue(new Error("DynamoDB update failed"));
    mockDynamoDBController._updateDataToDynamoDBTable = mockUpdateDynamoDb;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    await schedulerService.updateDynamoDb();
  
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateDynamoDb task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled updateDynamoDb task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });
  
  it("should execute updateOnChainPosts task correctly", async () => {
    const mockFindOnChainPosts = jest.fn().mockResolvedValue(undefined);
    mockPolkassemblyController._findOnChainPosts = mockFindOnChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPosts();
    await scheduledCallback();
  
    expect(mockFindOnChainPosts).toHaveBeenCalledTimes(proposalTypeList.length);
    proposalTypeList.forEach((type) => {
      expect(mockFindOnChainPosts).toHaveBeenCalledWith(type, "All", "newest");
    });
  });
  
  it("should log an error if updateOnChainPosts fails", async () => {
    const mockFindOnChainPosts = jest.fn().mockRejectedValue(new Error("Polkassembly fetch failed"));
    mockPolkassemblyController._findOnChainPosts = mockFindOnChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    await schedulerService.updateOnChainPosts();
  
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });

  it("should execute updateOffChainDiscussionsPosts task correctly", async () => {
    const mockFindOffChainPosts = jest.fn().mockResolvedValue(undefined);
    mockPolkassemblyController._findOffChainPosts = mockFindOffChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDiscussionsPosts();
    await scheduledCallback();
  
    expect(mockFindOffChainPosts).toHaveBeenCalledTimes(offChainPolkassemblyTypeList.length);
    offChainPolkassemblyTypeList.forEach((type) => {
      expect(mockFindOffChainPosts).toHaveBeenCalledWith(type);
    });
  });
  
  it("should log an error if updateOffChainDiscussionsPosts fails", async () => {
    const mockFindOffChainPosts = jest.fn().mockRejectedValue(new Error("Polkassembly fetch failed"));
    mockPolkassemblyController._findOffChainPosts = mockFindOffChainPosts;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    await schedulerService.updateOffChainDiscussionsPosts();
  
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateOffChainDiscussionsPosts task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled updateOffChainDiscussionsPosts task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });
  
  it("should execute updateOffChainEventsPosts task correctly", async () => {
    const mockFindSubmissionsEvents = jest.fn().mockResolvedValue(undefined);
    mockDotEventsController._findSubmissionsEvents = mockFindSubmissionsEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainEventsPosts();
    await scheduledCallback();
  
    expect(mockFindSubmissionsEvents).toHaveBeenCalledTimes(1);
  });

  it("should log an error if updateOffChainEventsPosts fails", async () => {
    const mockFindSubmissionsEvents = jest.fn().mockRejectedValue(new Error("Event fetch failed"));
    mockDotEventsController._findSubmissionsEvents = mockFindSubmissionsEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    await schedulerService.updateOffChainEventsPosts();
  
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateOffChainEventsPosts task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled updateOffChainEventsPosts task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });
  
  it("should execute updateOffChainMeetUpEventsPosts task correctly", async () => {
    const mockFindMeetUpEvents = jest.fn().mockResolvedValue(undefined);
    mockDotMeetUpsController._findMeetUpEvents = mockFindMeetUpEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainMeetUpEventsPosts();
    await scheduledCallback();
  
    expect(mockFindMeetUpEvents).toHaveBeenCalledTimes(1);
  });

  it("should log an error if updateOffChainMeetUpEventsPosts fails", async () => {
    const mockFindMeetUpEvents = jest.fn().mockRejectedValue(new Error("Meetup fetch failed"));
    mockDotMeetUpsController._findMeetUpEvents = mockFindMeetUpEvents;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
  
    await schedulerService.updateOffChainMeetUpEventsPosts();
  
    await expect(scheduledCallback()).rejects.toThrow("Error executing scheduled updateOffChainMeetUpEventsPosts task");
  
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error executing scheduled updateOffChainMeetUpEventsPosts task:",
      expect.any(Error)
    );
  
    consoleSpy.mockRestore();
  });
  
  it("should execute updateOnChainPostFolder task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ post_id: "123" }],
      modifiedPostsIds: ["123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue([]);
    const mockFindOnChainPost = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockPolkassemblyController._findOnChainPost = mockFindOnChainPost;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainPostFolder();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockS3ListFilesAndFolders).toHaveBeenCalledTimes(proposalTypeList.length);
    expect(mockFindOnChainPost).toHaveBeenCalledWith(expect.any(String), "123");
  });
  
  it("should execute updateOnChainDataToVectorStore task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ post_id: "123" }],
      modifiedPostsIds: ["123"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue(["OnChainPost/Democracy/123/"]);
    const mockOpenAIUploadFiles = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockOpenAIUploadFiles;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOnChainDataToVectorStore();
    await scheduledCallback();
  
    expect(mockS3GetFile).toHaveBeenCalledTimes(onChainProposalTypeList.length);
    expect(mockS3ListFilesAndFolders.mock.calls.length).toBeGreaterThanOrEqual(onChainProposalTypeList.length);
    expect(mockOpenAIUploadFiles).toHaveBeenCalledWith(expect.any(Array));
  });
  
  it("should execute updateOffChainDataToVectorStore task correctly", async () => {
    const mockS3GetFile = jest.fn().mockResolvedValue({
      posts: [{ post_id: "456" }],
      modifiedPostsIds: ["456"],
    });
    const mockS3ListFilesAndFolders = jest.fn().mockResolvedValue(["OffChainPost/Discussions/456/"]);
    const mockOpenAIUploadFiles = jest.fn().mockResolvedValue(undefined);
  
    mockS3Controller._s3GetFile = mockS3GetFile;
    mockS3Controller._s3ListFilesAndFolders = mockS3ListFilesAndFolders;
    mockOpenAIController._uploadFilesToOpenAIVectorStore = mockOpenAIUploadFiles;
  
    let scheduledCallback: Function;
    cron.schedule.mockImplementation((_, callback) => {
      scheduledCallback = callback;
    });
  
    await schedulerService.updateOffChainDataToVectorStore();
    await scheduledCallback();
  
    expect(mockS3GetFile.mock.calls.length).toBeGreaterThanOrEqual(offChainProposalTypeList.length);
    expect(mockS3ListFilesAndFolders.mock.calls.length).toBeGreaterThanOrEqual(offChainProposalTypeList.length);
    expect(mockOpenAIUploadFiles).toHaveBeenCalledWith(expect.any(Array));
  });
  
});
