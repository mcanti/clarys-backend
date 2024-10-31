import "reflect-metadata";
import { Container } from "inversify";

import { AwsStorageService } from "../services/awsStorage.service";
import { FileService } from "../services/file.service";
import { PolkassemblyService } from "../services/polkassembly.service";
import { SchedulerService } from "../services/scheduler.service";

import { PolkassemblyController } from "../controllers/polkassembly.controller";
import "../controllers/s3.controller";

const container = new Container();

container.bind<AwsStorageService>(AwsStorageService.name).to(AwsStorageService);
container.bind<FileService>(FileService.name).to(FileService);
container
  .bind<PolkassemblyService>(PolkassemblyService.name)
  .to(PolkassemblyService);
container.bind<SchedulerService>(SchedulerService.name).to(SchedulerService);

container
  .bind<PolkassemblyController>(PolkassemblyController.name)
  .to(PolkassemblyController);

export { container };
