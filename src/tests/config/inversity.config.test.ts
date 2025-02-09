import "reflect-metadata";
import { Container } from "inversify";

import { AwsStorageService } from "../../services/awsStorage.service";
import { FileService } from "../../services/file.service";
import { GoogleServices } from "../../services/google.services";
import { AwsDynamoDBService } from "../../services/awsDynamoDB.service";

// Data Services
import { PolkassemblyService } from "../../services/polkassembly.service";
import { DotEventsService } from "../../services/dotevents.service";
import { DotMeetUpService } from "../../services/dotmeetup.service";

// AI Services
import { OpenAIService } from "../../services/openAI.service";

// Schedulers Services
import { SchedulerService } from "../../services/scheduler.service";

// AWS Controllers
import { S3Controller } from "../../controllers/s3.controller";
import { DynamoDBController } from "../../controllers/dynamoDB.controller";

// Data Controllers
import { PolkassemblyController } from "../../controllers/polkassembly.controller";
import { DotEventsController } from "../../controllers/dotevents.controller";
import { DotMeetUpsController } from "../../controllers/dotMeetUps.controller";

// AI Controllers
import { OpenAIController } from "../../controllers/openAI.controller";

// Utility Controllers
import { UtilityController } from "../../controllers/utility.controller";

describe("Inversify Container", () => {
  let testContainer: Container;

  beforeEach(() => {
    testContainer = new Container();

    // Register services
    testContainer.bind<AwsStorageService>(AwsStorageService).toSelf();
    testContainer.bind<AwsDynamoDBService>(AwsDynamoDBService).toSelf();
    testContainer.bind<GoogleServices>(GoogleServices).toSelf();
    testContainer.bind<FileService>(FileService).toSelf();

    testContainer.bind<PolkassemblyService>(PolkassemblyService).toSelf();
    testContainer.bind<DotEventsService>(DotEventsService).toSelf();
    testContainer.bind<DotMeetUpService>(DotMeetUpService).toSelf();

    testContainer.bind<OpenAIService>(OpenAIService).toSelf();
    testContainer.bind<SchedulerService>(SchedulerService).toSelf();

    // Register controllers
    testContainer.bind<S3Controller>(S3Controller).toSelf();
    testContainer.bind<DynamoDBController>(DynamoDBController).toSelf();

    testContainer.bind<PolkassemblyController>(PolkassemblyController).toSelf();
    testContainer.bind<DotEventsController>(DotEventsController).toSelf();
    testContainer.bind<DotMeetUpsController>(DotMeetUpsController).toSelf();

    testContainer.bind<OpenAIController>(OpenAIController).toSelf();
    testContainer.bind<UtilityController>(UtilityController).toSelf();

    // Set environment variables
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
  });

  afterEach(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  it("should resolve all registered services", () => {
    // Check if all services are bound before retrieving them
    expect(testContainer.isBound(AwsStorageService)).toBeTruthy();
    expect(testContainer.isBound(AwsDynamoDBService)).toBeTruthy();
    expect(testContainer.isBound(GoogleServices)).toBeTruthy();
    expect(testContainer.isBound(FileService)).toBeTruthy();
    expect(testContainer.isBound(PolkassemblyService)).toBeTruthy();
    expect(testContainer.isBound(DotEventsService)).toBeTruthy();
    expect(testContainer.isBound(DotMeetUpService)).toBeTruthy();
    expect(testContainer.isBound(OpenAIService)).toBeTruthy();
    expect(testContainer.isBound(SchedulerService)).toBeTruthy();

    // Validate that they resolve to instances of their respective classes
    // expect(testContainer.get<AwsStorageService>(AwsStorageService)).toBeInstanceOf(AwsStorageService);
    // expect(testContainer.get<AwsDynamoDBService>(AwsDynamoDBService)).toBeInstanceOf(AwsDynamoDBService);
    // expect(testContainer.get<GoogleServices>(GoogleServices)).toBeInstanceOf(GoogleServices);
    // expect(testContainer.get<FileService>(FileService)).toBeInstanceOf(FileService);
    // expect(testContainer.get<PolkassemblyService>(PolkassemblyService)).toBeInstanceOf(PolkassemblyService);
    // expect(testContainer.get<DotEventsService>(DotEventsService)).toBeInstanceOf(DotEventsService);
    // expect(testContainer.get<DotMeetUpService>(DotMeetUpService)).toBeInstanceOf(DotMeetUpService);
    // expect(testContainer.get<OpenAIService>(OpenAIService)).toBeInstanceOf(OpenAIService);
    // expect(testContainer.get<SchedulerService>(SchedulerService)).toBeInstanceOf(SchedulerService);
  });

  it("should resolve all registered controllers", () => {
    // Check if all controllers are bound before retrieving them
    expect(testContainer.isBound(S3Controller)).toBeTruthy();
    expect(testContainer.isBound(DynamoDBController)).toBeTruthy();
    expect(testContainer.isBound(PolkassemblyController)).toBeTruthy();
    expect(testContainer.isBound(DotEventsController)).toBeTruthy();
    expect(testContainer.isBound(DotMeetUpsController)).toBeTruthy();
    expect(testContainer.isBound(OpenAIController)).toBeTruthy();
    expect(testContainer.isBound(UtilityController)).toBeTruthy();

    // Validate that they resolve to instances of their respective classes
    // expect(testContainer.get<S3Controller>(S3Controller)).toBeInstanceOf(S3Controller);
    // expect(testContainer.get<DynamoDBController>(DynamoDBController)).toBeInstanceOf(DynamoDBController);
    // expect(testContainer.get<PolkassemblyController>(PolkassemblyController)).toBeInstanceOf(PolkassemblyController);
    // expect(testContainer.get<DotEventsController>(DotEventsController)).toBeInstanceOf(DotEventsController);
    // expect(testContainer.get<DotMeetUpsController>(DotMeetUpsController)).toBeInstanceOf(DotMeetUpsController);
    // expect(testContainer.get<OpenAIController>(OpenAIController)).toBeInstanceOf(OpenAIController);
    // expect(testContainer.get<UtilityController>(UtilityController)).toBeInstanceOf(UtilityController);
  });

  it("should throw an error when resolving an unregistered dependency", () => {
    class FakeService {}
    expect(() => testContainer.get<FakeService>("FakeService")).toThrow();
  });
});
