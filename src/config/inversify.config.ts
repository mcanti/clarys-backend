import "reflect-metadata";
import { Container } from "inversify";
import * as process from "process";

import { AwsStorageService } from "../services/awsStorage.service";
import { FileService } from "../services/file.service";
import { GoogleServices } from "../services/google.services";
import { PolkassemblyService } from "../services/polkassembly.service";
import { DotEventsService } from "../services/dotevents.service";
import { SchedulerService } from "../services/scheduler.service";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import { DotEventsController } from "../controllers/dotevents.controller";
import { S3Controller } from "../controllers/s3.controller";

if (!process.env.GOOGLE_CLIENT_ID) {
  throw Error("GOOGLE_CLIENT_ID missing");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw Error("GOOGLE_CLIENT_SECRET missing");
}
if (!process.env.GOOGLE_REDIRECT_URI) {
  throw Error("GOOGLE_REDIRECT_URI missing");
}
if (!process.env.GOOGLE_ACCESS_TOKEN) {
  throw Error("GOOGLE_ACCESS_TOKEN missing");
}

const container = new Container();

container.bind<AwsStorageService>(AwsStorageService.name).to(AwsStorageService);
container.bind<GoogleServices>(GoogleServices.name).to(GoogleServices);
container.bind<FileService>(FileService.name).to(FileService);
container
  .bind<PolkassemblyService>(PolkassemblyService.name)
  .to(PolkassemblyService);
container.bind<DotEventsService>(DotEventsService.name).to(DotEventsService);

container.bind<SchedulerService>(SchedulerService.name).to(SchedulerService);

container
  .bind<PolkassemblyController>(PolkassemblyController.name)
  .to(PolkassemblyController);
container
  .bind<DotEventsController>(DotEventsController.name)
  .to(DotEventsController);

container.bind<S3Controller>(S3Controller.name).to(S3Controller);

export { container };
