import { injectable } from "inversify";
import { OpenAI } from "openai";
import { FileListParams } from "openai/resources";
import * as process from "process";

// import pino from "pino";

if (!process.env.OPENAI_API_KEY) {
  throw Error("OPENAI_API_KEY missing");
}

if (!process.env.OPENAI_ORGANIZATION_ID) {
  throw Error("OPENAI_ORGANIZATION_ID missing");
}

if (!process.env.OPENAI_PROJECT_ID) {
  throw Error("OPENAI_PROJECT_ID missing");
}

if (!process.env.VECTOR_STORE_ID) {
  throw Error("VECTOR_STORE_ID missing");
}

// const logger = pino(
//   {
//     level: "info",
//   },
//   pino.destination("logs.json")
// );

// function logResponse(response) {
//   logger.info(response, "OPEN AI API Response");
// }

@injectable()
export class OpenAIService {
  private apiKey: string;
  private vectorStoreId: string;
  private organizationId: string;
  private projectId: string;
  private openai: OpenAI;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY as string;
    this.organizationId = process.env.OPENAI_ORGANIZATION_ID as string;
    this.projectId = process.env.OPENAI_PROJECT_ID as string;
    this.vectorStoreId = process.env.VECTOR_STORE_ID as string;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      organization: this.organizationId,
      project: this.projectId,
    });
  }

  async getFile(fileId: string) {
    try {
      const response = await this.openai.files.retrieve(fileId);

      return response;
    } catch (error) {
      console.error("Error List Files:", error);
      return null;
    }
  }

  async listFiles(params: FileListParams) {
    try {
      const response = await this.openai.files.list(params);

      return response;
    } catch (error) {
      console.error("Error List Files:", error);
      return null;
    }
  }

  async listVectorStoreFiles(params: FileListParams) {
    try {
      const response = await this.openai.beta.vectorStores.files.list(
        this.vectorStoreId,
        params
      );

      return response;
    } catch (error) {
      console.error("Error List Vector Store Files files:", error);
      return null;
    }
  }

  async deleteVectorStoreFile(fileId: string) {
    try {
      const response = await this.openai.beta.vectorStores.files.del(
        this.vectorStoreId,
        fileId
      );
    } catch (error) {
      console.error("Error deleting Vector Store File", error);
      return null;
    }
  }

  async uploadFilesToOpenAIVectorStore(filesData) {
    try {
      // Upload files to OpenAI vector store
      const response =
        await this.openai.beta.vectorStores.fileBatches.uploadAndPoll(
          this.vectorStoreId,
          filesData
        );
      console.log("Vector store uploadAndPoll response:", response);
      return response;
    } catch (error) {
      console.error("Error uploading files to OpenAI vector store:", error);
      return null;
    }
  }
}
