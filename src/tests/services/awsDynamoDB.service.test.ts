import { AwsDynamoDBService } from "../../services/awsDynamoDB.service";
import {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  PutItemCommand,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

jest.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: jest.fn(() => ({ send: jest.fn() })),
    DescribeTableCommand: jest.fn(),
    CreateTableCommand: jest.fn(),
    PutItemCommand: jest.fn(),
    UpdateItemCommand: jest.fn(),
    ScanCommand: jest.fn(),
  };
});

describe("AwsDynamoDBService", () => {
  let dynamoDBService;
  let mockSend;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
  });  

  afterAll(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  beforeEach(() => {
    dynamoDBService = new AwsDynamoDBService();
    mockSend = jest.spyOn(dynamoDBService.dynamoDBClient, "send");
  });  

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return error if createDynamoDBTableIfNotExists encounters AWS error", async () => {
    mockSend.mockRejectedValue(new Error("AWS Create Table Error"));

    const response = await dynamoDBService.createDynamoDBTableIfNotExists(
      "TestTable"
    );

    expect(response).toEqual({ error: "AWS Create Table Error" });
  }); 

  test("should return error if updateItemIntoTable encounters AWS error", async () => {
    mockSend.mockRejectedValue(new Error("AWS Internal Error"));
    const item = { postId: "123", creationDate: "2025-02-08", type: "post" };
    const response = await dynamoDBService.updateItemIntoTable(
      "TestTable",
      item
    );
    expect(response).toEqual({ error: "AWS Internal Error" });
  });

  test("should return all posts when no filters are applied", async () => {
    mockSend.mockResolvedValue({
      Items: [
        { postId: { S: "123" }, type: { S: "post" } },
        { postId: { S: "456" }, type: { S: "news" } },
      ],
    });
    const response = await dynamoDBService.getFilteredPosts("TestTable", {});
    expect(response).toEqual([
      { postId: "123", type: "post" },
      { postId: "456", type: "news" },
    ]);
  });

  test("should return error for empty table name in createDynamoDBTableIfNotExists", async () => {
    const response = await dynamoDBService.createDynamoDBTableIfNotExists("");
    expect(response).toEqual({ error: "Table name cannot be empty" });
  });

  test("should handle AWS error in getFilteredPosts", async () => {
    mockSend.mockRejectedValue(new Error("AWS Scan Error"));
    await expect(
      dynamoDBService.getFilteredPosts("TestTable", {})
    ).rejects.toThrow("AWS Scan Error");
  });

  test("should handle various comparison operators in getFilteredPosts", async () => {
    mockSend.mockResolvedValue({
      Items: [
        {
          postId: { S: "123" },
          requestedAmount: { N: "1000" },
          reward: { N: "500" },
        },
      ],
    });
    const filters = {
      requestedAmount: "1000",
      reward: "500",
      requestedAmountOperator: ">=",
      rewardOperator: "<=",
    };
    const response = await dynamoDBService.getFilteredPosts(
      "TestTable",
      filters
    );
    expect(response).toEqual([
      { postId: "123", requestedAmount: 1000, reward: 500 },
    ]);
  });

  test("should handle deeply nested NULL values in dynamoDBToJSON", () => {
    const dynamoItem = {
      postId: { S: "123" },
      details: {
        M: {
          key1: { NULL: true },
          key2: { S: "value" },
          key3: { L: [{ NULL: true }] },
        },
      },
    };
    const result = dynamoDBService.dynamoDBToJSON(dynamoItem);
    expect(result).toEqual({
      postId: "123",
      details: { key1: null, key2: "value", key3: [null] },
    });
  });

  test("should handle unexpected attribute structures in dynamoDBToJSON", () => {
    const dynamoItem = {
      postId: { S: "123" },
      details: { M: { key1: { N: "NaN" }, key2: { BOOL: false } } },
    };
  
    const result = dynamoDBService.dynamoDBToJSON(dynamoItem);
  
    expect(result.postId).toBe("123");
    expect(result.details.key2).toBe(false);
    expect(result.details.key1).toBeNaN();
  });

  test("should return error if updateItemIntoTable is called with missing postId", async () => {
    const item = { creationDate: "2025-02-08", type: "post" };
    const response = await dynamoDBService.updateItemIntoTable(
      "TestTable",
      item
    );
    expect(response).toEqual({ error: "Missing postId in update request" });
  });

  test("should return error if updateItemIntoTable is called with missing item fields", async () => {
    const item = { postId: "123" };
    const response = await dynamoDBService.updateItemIntoTable(
      "TestTable",
      item
    );
    expect(response).toEqual({
      error: "Missing required fields in update request",
    });
  });

  test("should return error if DynamoDBClient fails to initialize", () => {
    const oldEnv = { ...process.env };
  
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  
    expect(() => new AwsDynamoDBService()).toThrow("AWS_ACCESS_KEY_ID missing");
  
    process.env = oldEnv;
  });
  
  test("should handle unexpected attribute structures in dynamoDBToJSON", () => {
    const dynamoItem = {
      postId: { S: "123" },
      details: {
        M: {
          key1: { N: "NaN" },
          key2: { BOOL: false },
          key3: { L: [{ N: "Infinity" }] },
        },
      },
    };
    const result = dynamoDBService.dynamoDBToJSON(dynamoItem);
    expect(result).toEqual({
      postId: "123",
      details: { key1: NaN, key2: false, key3: [Infinity] },
    });
  });

  test("should return empty array when no matching filters are found", async () => {
    mockSend.mockResolvedValue({ Items: [] }); 
    const response = await dynamoDBService.getFilteredPosts("TestTable", { postId: "99999" });
    expect(response).toEqual([]);
  });
  
  test("should successfully update an item with partial fields", async () => {
    mockSend.mockResolvedValue({
      Attributes: { postId: { S: "123" }, type: { S: "post-updated" } },
    });
  
    const item = { postId: "123", creationDate: "2025-02-08", type: "post-updated" };
    const response = await dynamoDBService.updateItemIntoTable("TestTable", item);
  
    const unwrappedResponse = dynamoDBService.dynamoDBToJSON(response.Attributes);
  
    expect(unwrappedResponse).toEqual({ postId: "123", type: "post-updated" });
    expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateItemCommand));
  });
  
  test("should handle unexpected data types in dynamoDBToJSON", () => {
    const dynamoItem = {
      postId: { S: "123" },
      details: {
        M: {
          key1: { B: Uint8Array.from([72, 101, 108, 108, 111]) }, // "Hello" in ASCII
          key2: { S: "valid" },
          key3: { N: "42" },
          key4: { BOOL: true },
          key5: { NULL: true },
          key6: { L: [{ S: "listItem1" }, { S: "listItem2" }] },
          key7: { M: { subKey1: { S: "nested" } } },
        },
      },
    };
  
    const result = dynamoDBService.dynamoDBToJSON(dynamoItem);
  
    expect(result).toEqual({
      postId: "123",
      details: {
        key1: "SGVsbG8=", // Base64 encoding of "Hello"
        key2: "valid",
        key3: 42,
        key4: true,
        key5: null,
        key6: ["listItem1", "listItem2"],
        key7: { subKey1: "nested" },
      },
    });
  });
  
});
