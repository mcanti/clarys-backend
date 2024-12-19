import express from "express";
import cors from "cors";
import cluster from "cluster";
import os from "os";
import { join } from "path";
import "reflect-metadata";
import { container } from "./src/config/inversify.config";

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUiExpress from "swagger-ui-express";
import { fsReadFile } from "ts-loader/dist/utils";
import * as process from "process";

import { Config } from "./src/config/config";

import { responseWrapper } from "./src/middleware/response.middleware";
import { SwaggerHelper } from "./src/helpers/swaggerHelper";

import { InversifyExpressServer } from "inversify-express-utils";
import { SchedulerService } from "./src/services/scheduler.service";

const configs = new Config().getConfig();
const port = process.env.PORT ? process.env.PORT : configs.port;
const cCPUs =
  process.env.NODE_ENV && process.env.NODE_ENV === "production"
    ? os.cpus().length
    : 1;

const startDate = new Date();

function setupStatusPage(app) {
  app.get("/", (req, res) => {
    let file = fsReadFile(join(__dirname, "public", "index.html"));

    if (file) {
      file = file.replace("{{applicationName}}", "Clarys Express API Server");
      file = file.replace("{{serverStartDate}}", startDate.toISOString());
      file = file.replace(
        "{{serverUptime}}",
        `${(new Date().getTime() - startDate.getTime()) / 1000} seconds`
      );
      file = file.replace("{{swaggerURL}}", "/swagger");
    }

    res.send(file);
  });
}

function setupSwagger(app) {
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Hello",
        version: "1.0.0",
      },
      components: {},
    },
    apis: ["./src/controllers/*.ts", __dirname + "/src/controllers/*.ts"],
  };

  const swaggerDocs: any = swaggerJsdoc(swaggerOptions);
  const helper = new SwaggerHelper();
  helper.addSwaggerResponseSchema(swaggerDocs);
  app.use(
    "/swagger",
    swaggerUiExpress.serve,
    swaggerUiExpress.setup(swaggerDocs)
  );
}

const server = new InversifyExpressServer(container);

if (cluster.isPrimary) {
  for (let i = 0; i < cCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", function (worker) {
    console.log("Worker " + worker.process.pid + " is online");
  });

  cluster.on("exit", function (worker, code, signal) {
    console.log(
      `Worker ${worker.process.pid} died with code : ${code}, and signal ${signal}`
    );
    if (code !== 0 && signal != "SIGTERM" && signal != "SIGINT") {
      console.log("Starting a new worker to replace the dead one");
      cluster.fork();
    }
  });

  
} else {
  server.setConfig((app) => {
    setupSwagger(app);
    app.use(
      cors({
        origin: [`http://0.0.0.0:${port}`, `https://0.0.0.0:${port}`],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: false,
      })
    );
    app.use(responseWrapper);
    app.use(express.json());
  });

  const app: express.Application = server.build();
  app.listen(port);
  setupStatusPage(app);


  const serverInfo = {
    "API Port": port,
    "Localhost URL": `http://0.0.0.0:${port}`,
    "Swagger URL": `http://0.0.0.0:${port}/swagger`,
  };

  console.table(serverInfo);

  const scheduler = container.get<SchedulerService>(SchedulerService.name);
  scheduler.updateOnChainPosts();
  scheduler.updateOnChainPostFolder();

  scheduler.updateOffChainDiscussionsPosts();
  scheduler.updateOffChainDiscussionsPostFolder();

  scheduler.updateOffChainEventsPosts();
  scheduler.updateOffChainEventsAndSubEventsPostFolder();

  scheduler.updateOffChainMeetUpEventsPosts();
  scheduler.updateOffChainMeetUpEventsPostFolder();

  scheduler.updateOnChainDataToVectorStore();
  scheduler.updateOffChainDataToVectorStore();
}
