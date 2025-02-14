import { injectable } from "inversify";
import {
  AttributeValue,
  DynamoDBClient,
  ScanCommand,
  DescribeTableCommand,
  CreateTableCommand,
  PutItemCommand,
  PutItemCommandInput,
  UpdateItemCommandInput,
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
      docsLinks: string[];
      vectorFileId: string;
      post: Record<string, any>; // Allow mixed types in post object
    }
  ) => {
    let retryCount = 0;
    let maxRetries = 2;
  
    while (retryCount <= maxRetries) {
      try {
        if (retryCount === 1) {
          console.log(`Retrying item ${item.postId} in table ${tableName} with no content attribute in post to reduce size...`);
          if(item?.post?.content){
            delete item.post.content;
          }
        }
        if (retryCount === 2) {
          console.log(`Retrying item ${item.postId} in table ${tableName} with null post to reduce size...`);
          item.post = null;
        }
        const categoriesAsDynamoDBList = item.categories.map((category) => ({ S: category }));
        const docsLinksAsDynamoDBList = item.docsLinks.map((link) => ({ S: link }));
  
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
          docsLinks: { L: docsLinksAsDynamoDBList },
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
        console.error(`Error adding to table ${tableName} item ${item.postId}, Attempt ${retryCount + 1}:`, err);
        retryCount++;
        
        if (retryCount > maxRetries) {
          console.log("Final attempt failed. Item was not added.");
          return null;
        }
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };
  

  updateItemIntoTable = async (
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
      docsLinks: string[];
      post: Record<string, any>;
    }
  ) => {
    try {
      const convertToDynamoDBFormat = (data) => {
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
  
      const updateExpressionParts = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};
  
      const addUpdateExpression = (key, value) => {
        const attributePlaceholder = `#${key}`;
        const valuePlaceholder = `:${key}`;
        updateExpressionParts.push(`${attributePlaceholder} = ${valuePlaceholder}`);
        expressionAttributeValues[valuePlaceholder] = convertToDynamoDBFormat(value);
        expressionAttributeNames[attributePlaceholder] = key;
      };
  
      addUpdateExpression("creationDate", item.creationDate);
      addUpdateExpression("type", item.type);
      addUpdateExpression("subType", item.subType);
      addUpdateExpression("categories", item.categories);
      addUpdateExpression("docsLinks", item.docsLinks);
      addUpdateExpression("requestedAmount", item.requestedAmount);
      addUpdateExpression("reward", item.reward);
      addUpdateExpression("submitter", item.submitter);
      addUpdateExpression("vectorFileId", item.vectorFileId);
      addUpdateExpression("json", item.post);
  
      const params: UpdateItemCommandInput = {
        TableName: tableName,
        Key: {
          postId: { S: item.postId },
        },
        UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: "ALL_NEW",
      };
  
      const command = new UpdateItemCommand(params);
      const updateResponse = await this.dynamoDBClient.send(command);
      console.log("Item updated successfully:", updateResponse);
  
      return updateResponse;
    } catch (err) {
      console.error("Error updating item:", err);
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
    filters: {
      postId?: string;
      type?: string;
      subType?: string;
      category?: string[];
      requestedAmount?: string;
      requestedAmountOperator?: string; // Default to '='
      reward?: string;
      rewardOperator?: string; // Default to '='
      submitter?: string;
      startDate?: string; // yyyy-mm-dd or 'today'
      endDate?: string; // yyyy-mm-dd or 'today'
      vectorFileId?: string;
    }
  ) => {
    try {
      let filterExpression = "";
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};
  
      const addFilter = (key: string, operator: string, value: any) => {
        const placeholder = `:val${Object.keys(expressionAttributeValues).length}`;
        const attributeNamePlaceholder = `#${key}`;
        filterExpression += filterExpression ? " AND " : "";
        filterExpression += `${attributeNamePlaceholder} ${operator} ${placeholder}`;
        expressionAttributeValues[placeholder] = { S: value };
        expressionAttributeNames[attributeNamePlaceholder] = key;
      };
  
      if (filters.postId) addFilter("postId", "=", filters.postId);
      if (filters.type) addFilter("type", "=", filters.type);
      if (filters.subType) addFilter("subType", "=", filters.subType);
      if (filters.submitter) addFilter("submitter", "=", filters.submitter);
      if (filters.vectorFileId) addFilter("vectorFileId", "=", filters.vectorFileId);
  
      if (filters.category && filters.category.length > 0) {
        filters.category.forEach((cat, index) => {
          const placeholder = `:cat${index}`;
          filterExpression += filterExpression ? " AND " : "";
          filterExpression += `contains(#categories, ${placeholder})`;
          expressionAttributeValues[placeholder] = { S: cat };
        });
        expressionAttributeNames["#categories"] = "categories";
      }
  
      const requestedAmountOperator = filters.requestedAmountOperator || "=";
      const rewardOperator = filters.rewardOperator || "=";
  
      const validOperators = new Set(["=", "<", "<=", ">", ">="]);
  
      if (filters.requestedAmount) {
        if (validOperators.has(requestedAmountOperator)) {
          const placeholder = `:requestedAmount`;
          filterExpression += filterExpression ? " AND " : "";
          filterExpression += `#requestedAmount ${requestedAmountOperator} ${placeholder}`;
          expressionAttributeValues[placeholder] = { N: filters.requestedAmount };
          expressionAttributeNames["#requestedAmount"] = "requestedAmount";
        }
      }
  
      if (filters.reward) {
        if (validOperators.has(rewardOperator)) {
          const placeholder = `:reward`;
          filterExpression += filterExpression ? " AND " : "";
          filterExpression += `#reward ${rewardOperator} ${placeholder}`;
          expressionAttributeValues[placeholder] = { N: filters.reward };
          expressionAttributeNames["#reward"] = "reward";
        }
      }
  
      const today = new Date().toISOString().split("T")[0]; // Format: yyyy-mm-dd
      if (filters.startDate) {
        const startDate = filters.startDate === "today" ? today : filters.startDate;
        const placeholder = `:startDate`;
        filterExpression += filterExpression ? " AND " : "";
        filterExpression += `#creationDate >= ${placeholder}`;
        expressionAttributeValues[placeholder] = { S: startDate };
        expressionAttributeNames["#creationDate"] = "creationDate";
      }
  
      if (filters.endDate) {
        const endDate = filters.endDate === "today" ? today : filters.endDate;
        const placeholder = `:endDate`;
        filterExpression += filterExpression ? " AND " : "";
        filterExpression += `#creationDate <= ${placeholder}`;
        expressionAttributeValues[placeholder] = { S: endDate };
        expressionAttributeNames["#creationDate"] = "creationDate";
      }
  
      const params: any = {
        TableName: tableName,
      };
  
      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
  
      console.log("DynamoDB Query Params:", JSON.stringify(params, null, 2));
  
      const command = new ScanCommand(params);
      const result = await this.dynamoDBClient.send(command);
  
      let transformedItems = result.Items?.map(this.dynamoDBToJSON) || [];
  
      transformedItems.sort((a, b) => {
        const dateA = new Date(a.creationDate).getTime();
        const dateB = new Date(b.creationDate).getTime();
        return dateB - dateA;
      });
  
      return transformedItems;
    } catch (err) {
      console.error("Error getting Filtered Posts:", err);
      throw err;
    }
  };
  
}
