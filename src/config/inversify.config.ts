import "reflect-metadata";
import { Container } from "inversify";
import * as process from "process";

import { AwsStorageService } from "../services/awsStorage.service";
import { FileService } from "../services/file.service";
import { GoogleServices } from "../services/google.services";
import { PolkassemblyService } from "../services/polkassembly.service";
import { DotEventsService } from "../services/dotevents.service";
import { DotMeetUpService } from "../services/dotmeetup.service";
import { OpenAIService } from "../services/openAI.service";
import { SchedulerService } from "../services/scheduler.service";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import { DotEventsController } from "../controllers/dotevents.controller";
import { DotMeetUpsController } from "../controllers/dotMeetUps.controller";
import { S3Controller } from "../controllers/s3.controller";
import { OpenAIController } from "../controllers/openAI.controller";

const container = new Container();

container.bind<AwsStorageService>(AwsStorageService.name).to(AwsStorageService);
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
container.bind<OpenAIController>(OpenAIController.name).to(OpenAIController);

export { container };
