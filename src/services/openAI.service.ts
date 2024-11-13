import { injectable } from "inversify";
import axios from "axios";
import https from "https";

import * as process from "process";

import {
  ListFilesParamsInterface,
  GetFileParamsInterface,
  GetFileContentParamsInterface,
  DeleteFileParamsInterface,
  UploadFileBodyParamsInterface,
  AddFileToVectorStoreBodyParamsInterface,
  DeleteVectorStoreFileParamsInterface
} from "../interfaces/openAI.interfaces";
import { fileToBlob } from "../helpers/jsonConvertor.helper";
import pino from "pino";


if (!process.env.OPENAI_API_KEY) {
  throw Error("OPENAI_API_KEY missing");
}

if (!process.env.VECTOR_STORE_ID) {
  throw Error("VECTOR_STORE_ID missing");
}

const logger = pino(
  {
    level: 'info',
  },
  pino.destination('logs.json') 
);

function logResponse(response) {
  logger.info(response, 'OPEN AI API Response');
}

@injectable()
export class OpenAIService {
  private apiKey: string;
  private vectorStoreId: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY as string;
    this.vectorStoreId = process.env.VECTOR_STORE_ID as string;
  }

  async listFiles(params: ListFilesParamsInterface) {
    try {
      const response = await axios.get("https://api.openai.com/v1/files", {
        params: params,
        maxBodyLength: Infinity,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Ignore SSL certificate errors
        }),
      });

      return response.data ?? [];
    } catch (err) {
      console.log("Error - listFiles: ", err);
      return [];
    }
  }

  async getFile(params: GetFileParamsInterface) {
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? {};
    } catch (err) {
      console.log("Error - getFile: ", err);
      return {};
    }
  }

  async getFileContent(params: GetFileContentParamsInterface) {
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/files/${params.file_id}/content`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? {};
    } catch (err) {
      console.log("Error - getFileContent: ", err);
      return {};
    }
  }

  async deleteFile(params: DeleteFileParamsInterface) {
    try {
      const response = await axios.delete(
        `https://api.openai.com/v1/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? {};
    } catch (err) {
      console.log("Error - deleteFile: ", err);
      return {};
    }
  }

  async uploadFile(params: UploadFileBodyParamsInterface) {
    try {
      
      const formData = new FormData();
      const blobFile = fileToBlob(params.file);
      formData.append("file", blobFile, params.filename);
      formData.append("purpose", params.purpose);

      const axiosInstance = axios.create({
        timeout: 300000,
      });
      
      const response = await axiosInstance.post(
        "https://api.openai.com/v1/files",
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      logResponse(response);

      return response.data;
    } catch (err) {
      console.log("Error - uploadFile: ", err);
      return { error: err.response?.data || "An error occurred during the upload." };
    }
  }

  async createVectorStoreFile(params: AddFileToVectorStoreBodyParamsInterface) {
    try {
      const axiosInstance = axios.create({
        timeout: 300000,
      });

      const response = await axiosInstance.post(
        `https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/files`,
        {
          ...params
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          httpsAgent: new https.Agent({
            keepAlive: true,
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      console.log("createVectorStoreFileResponse from Service: ", response);
      logResponse(response);
      return response.data;
    } catch (err) {
      console.log("Error - createVectorStoreFile: ", err);
      return { error: err.response?.data || "An error occurred during the upload." };
    }
  }

  async deleteVectorStoreFile(params: DeleteVectorStoreFileParamsInterface) {
    try {
      
      const response = await axios.delete(
        `https://api.openai.com/v1/vector_stores/${this.vectorStoreId}/files/${params.file_id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data;
    } catch (err) {
      console.log("Error - uploadFile: ", err);
      return { error: err.response?.data || "An error occurred during the upload." };
    }
  }

}
