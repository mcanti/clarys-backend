import { injectable } from "inversify";
import {
  AttributeValue,
  DynamoDBClient,
  ScanCommand,
  DescribeTableCommand,
  CreateTableCommand,
  PutItemCommand,
  PutItemCommandInput,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import https from "https";
import { readFileSync } from "fs";
import * as process from "process";

import { Config } from "../config/config";

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw Error("AWS_ACCESS_KEY_ID missing");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw Error("AWS_ACCESS_KEY_ID missing");
}

let agent = new https.Agent({
  rejectUnauthorized: true,
});

// if (process.env.NODE_ENV === "development") {
//   const certs = [readFileSync("./Zscaler_Root_CA.pem")];

//   agent = new https.Agent({
//     rejectUnauthorized: true,
//     ca: certs,
//   });
// }

interface CustomItem {
  postId: { S: string };
  creationDate: { S: string };
  type: { S: string };
  subType: { S: string };
  categories: { L: Array<{ S: string }> };
  submitter: { S: string };
  vectorFileId: { S: string };
  json: { M: Record<string, AttributeValue> };
}

@injectable()
export class AwsDynamoDBService {
  private readonly dynamoDBClient: DynamoDBClient;

  constructor() {
    const config = new Config().getConfig();
    this.dynamoDBClient = new DynamoDBClient({
      region: config.region,
      requestHandler: new NodeHttpHandler({
        httpAgent: agent,
        httpsAgent: agent,
      }),
    });
  }

  createDynamoDBTableIfNotExists = async (tableName: string) => {
    console.log("tableName", tableName);

    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const describeTableResponse = await this.dynamoDBClient.send(command);
      console.log("describeTableResponse: ", describeTableResponse);

      console.log(`Table ${tableName} already exists`);
    } catch (err) {
      if (err.name === "ResourceNotFoundException") {
        console.log(`Creating table ${tableName}`);
        const command = new CreateTableCommand({
          TableName: tableName,
          KeySchema: [
            { AttributeName: "postId", KeyType: "HASH" }, // Partition key
            { AttributeName: "creationDate", KeyType: "RANGE" }, // Sort key
          ],
          AttributeDefinitions: [
            { AttributeName: "postId", AttributeType: "S" },
            { AttributeName: "creationDate", AttributeType: "S" },
          ],
          BillingMode: "PAY_PER_REQUEST", // No provisioned throughput
        });

        const createTableResponse = await this.dynamoDBClient.send(command);
        console.log(
          "Table created successfully:",
          createTableResponse.TableDescription.TableName
        );

        return createTableResponse;
      } else {
        console.error(`Failed to describe or create table: ${err.message}`);
        return null;
      }
    }
  };

  addItemToTable = async (
    tableName: string,
    item: {
      postId: string;
      creationDate: string;
      type: string;
      subType: string;
      categories: string[];
      requestedAmount: string;
      reward: string;
      submitter: string;
      vectorFileId: string;
      post: Record<string, any>; // Allow mixed types in post object
    }
  ) => {
    try {
      const categoriesAsDynamoDBList = item.categories.map((category) => ({
        S: category,
      }));

      const convertToDynamoDBFormat = (data: any): any => {
        if (data === null || data === undefined) {
          return { NULL: true };
        } else if (typeof data === "string") {
          return { S: data };
        } else if (typeof data === "number") {
          return { N: data.toString() };
        } else if (typeof data === "boolean") {
          return { BOOL: data };
        } else if (Array.isArray(data)) {
          return { L: data.map((item) => convertToDynamoDBFormat(item)) };
        } else if (typeof data === "object") {
          return {
            M: Object.entries(data).reduce((acc, [key, value]) => {
              acc[key] = convertToDynamoDBFormat(value);
              return acc;
            }, {}),
          };
        } else {
          throw new Error(`Unsupported data type: ${typeof data}`);
        }
      };

      const postAsDynamoDBMap = convertToDynamoDBFormat(item.post);

      const itemParams = {
        postId: { S: item.postId },
        creationDate: { S: item.creationDate },
        type: { S: item.type },
        subType: { S: item.subType },
        categories: { L: categoriesAsDynamoDBList },
        requestedAmount: { S: item.requestedAmount },
        reward: { S: item.reward },
        submitter: { S: item.submitter },
        vectorFileId: { S: item.vectorFileId },
        json: postAsDynamoDBMap,
      };

      const params: PutItemCommandInput = {
        TableName: tableName,
        Item: itemParams,
      };

      const command = new PutItemCommand(params);
      const addItemToTableResponse = await this.dynamoDBClient.send(command);
      console.log("Item added successfully: ", addItemToTableResponse);

      return addItemToTableResponse;
    } catch (err) {
      console.error("Error adding item:", err);
      return null;
    }
  };

  dynamoDBToJSON = (dynamoItem: Record<string, any>): any => {
    const transformValue = (value: any): any => {
      if (value.S !== undefined) return value.S;
      if (value.N !== undefined) return Number(value.N);
      if (value.BOOL !== undefined) return value.BOOL;
      if (value.NULL !== undefined) return null;
      if (value.L !== undefined) return value.L.map(transformValue);
      if (value.M !== undefined) {
        return Object.entries(value.M).reduce((acc, [key, val]) => {
          acc[key] = transformValue(val);
          return acc;
        }, {} as Record<string, any>);
      }
      return value;
    };

    return Object.entries(dynamoItem).reduce((acc, [key, value]) => {
      acc[key] = transformValue(value);
      return acc;
    }, {} as Record<string, any>);
  };

  getFilteredPosts = async (
    tableName: string,
    filters: Record<string, any>
  ) => {
    console.log("tableName", tableName);
    console.log("filters", filters);

    try {
      let filterExpression = "";
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value], index) => {
          if (value !== undefined && value !== null) {
            const placeholder = `:val${index}`;
            const attributeNamePlaceholder = `#key${index}`;

            filterExpression += filterExpression ? ` AND ` : "";
            filterExpression += `${attributeNamePlaceholder} = ${placeholder}`;

            expressionAttributeValues[placeholder] =
              typeof value === "string"
                ? { S: value }
                : { N: value.toString() };
            expressionAttributeNames[attributeNamePlaceholder] = key;
          }
        });
      }

      const params: any = {
        TableName: tableName,
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = expressionAttributeNames;
      }

      console.log("params", params);

      const command = new ScanCommand(params);
      const result = await this.dynamoDBClient.send(command);

      // Transform the result into a plain JSON format
      const transformedItems = result.Items?.map(this.dynamoDBToJSON);

      return transformedItems;
    } catch (err) {
      console.error("Error getting Filtered Posts:", err);
      throw err;
    }
  };

  // addDataToDynamoDBTable = async (tableName: string) => {
  //   console.log("tableName", tableName);

  //   try {
  //     const command = new DescribeTableCommand({ TableName: tableName });
  //     const response = await this.dynamoDBClient.send(command);
  //     console.log("response", response);

  //     console.log(`Table ${tableName} already exists`);
  //   } catch (error) {
  //     if (error.name === "ResourceNotFoundException") {
  //       console.log(`Creating table ${tableName}`);
  //       const command = new CreateTableCommand({
  //         TableName: tableName,
  //         KeySchema: [
  //           { AttributeName: "postId", KeyType: "HASH" }, // Partition key
  //           { AttributeName: "creationDate", KeyType: "RANGE" }, // Sort key
  //         ],
  //         AttributeDefinitions: [
  //           { AttributeName: "postId", AttributeType: "S" }, // String
  //           { AttributeName: "creationDate", AttributeType: "S" }, // String
  //         ],
  //         BillingMode: "PAY_PER_REQUEST", // No provisioned throughput
  //       });

  //       const response = await this.dynamoDBClient.send(command);
  //       console.log(
  //         "Table created successfully:",
  //         response.TableDescription.TableName
  //       );
  //       return response;
  //     } else {
  //       console.error(`Failed to describe or create table: ${error.message}`);
  //       return null;
  //     }
  //   }
  // };
}
