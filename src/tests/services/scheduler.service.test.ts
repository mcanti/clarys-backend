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
});
