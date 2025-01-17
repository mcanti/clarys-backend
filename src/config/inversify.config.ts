import "reflect-metadata";
import { Container } from "inversify";
import * as process from "process";

import { AwsStorageService } from "../services/awsStorage.service";
import { FileService } from "../services/file.service";
import { GoogleServices } from "../services/google.services";
import { AwsDynamoDBService } from "../services/awsDynamoDB.service";

//Data Services
import { PolkassemblyService } from "../services/polkassembly.service";
import { DotEventsService } from "../services/dotevents.service";
import { DotMeetUpService } from "../services/dotmeetup.service";

//AI Services
import { OpenAIService } from "../services/openAI.service";

//Schedulers Services
import { SchedulerService } from "../services/scheduler.service";

//AWS Controllers
import { S3Controller } from "../controllers/s3.controller";
import { DynamoDBController } from "../controllers/dynamoDB.controller";

//Data Controllers
import { PolkassemblyController } from "../controllers/polkassembly.controller";
import { DotEventsController } from "../controllers/dotevents.controller";
import { DotMeetUpsController } from "../controllers/dotMeetUps.controller";

//AI Controllers
import { OpenAIController } from "../controllers/openAI.controller";

//Utitlity Controllers
import { UtilityController } from "../controllers/utility.controller";

const container = new Container();

container.bind<AwsStorageService>(AwsStorageService.name).to(AwsStorageService);
container
  .bind<AwsDynamoDBService>(AwsDynamoDBService.name)
  .to(AwsDynamoDBService);
container.bind<GoogleServices>(GoogleServices.name).to(GoogleServices);
container.bind<FileService>(FileService.name).to(FileService);

container
  .bind<PolkassemblyService>(PolkassemblyService.name)
  .to(PolkassemblyService);
container.bind<DotEventsService>(DotEventsService.name).to(DotEventsService);
container.bind<DotMeetUpService>(DotMeetUpService.name).to(DotMeetUpService);

container.bind<OpenAIService>(OpenAIService.name).to(OpenAIService);

container.bind<SchedulerService>(SchedulerService.name).to(SchedulerService);

container
  .bind<PolkassemblyController>(PolkassemblyController.name)
  .to(PolkassemblyController);
container
  .bind<DotEventsController>(DotEventsController.name)
  .to(DotEventsController);
container
  .bind<DotMeetUpsController>(DotMeetUpsController.name)
  .to(DotMeetUpsController);

container.bind<S3Controller>(S3Controller.name).to(S3Controller);
container.bind<DynamoDBController>(DynamoDBController.name).to(DynamoDBController);
container.bind<OpenAIController>(OpenAIController.name).to(OpenAIController);
container.bind<UtilityController>(UtilityController.name).to(UtilityController);

export { container };
