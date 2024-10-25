import "reflect-metadata";
import { Container } from "inversify";

import { PolkassemblyService } from '../services/polkassembly.service';
import { FileService } from '../services/file.service';
import { AwsStorageService } from '../helpers/awsStorage.service';

import '../controllers/polkassembly.controller';
import '../controllers/s3.controller';

const container = new Container();

container.bind<PolkassemblyService>(PolkassemblyService.name).to(PolkassemblyService);
container.bind<FileService>(FileService.name).to(FileService);
container.bind<AwsStorageService>(AwsStorageService.name).to(AwsStorageService);

export { container };