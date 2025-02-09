import { AwsDynamoDBService } from "../../services/awsDynamoDB.service";
import {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

jest.mock("@aws-sdk/client-dynamodb", () => {
  const actual = jest.requireActual("@aws-sdk/client-dynamodb");
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({
      send: jest.fn(),
    })),
  };
});

describe("AwsDynamoDBService", () => {
  let dynamoDBService;
  let mockSend;

  beforeAll(() => {
    process.env.AWS_ACCESS_KEY_ID = "fake-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "fake-secret-key";
  });
  
  afterAll(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  beforeEach(() => {
    dynamoDBService = new AwsDynamoDBService();
    mockSend = dynamoDBService.dynamoDBClient.send;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should check if table exists and create it if not", async () => {
    mockSend.mockRejectedValueOnce({ name: "ResourceNotFoundException" });
    mockSend.mockResolvedValueOnce({ TableDescription: { TableName: "TestTable" } });

    const response = await dynamoDBService.createDynamoDBTableIfNotExists("TestTable");
    
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeTableCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(CreateTableCommand));
    expect(response).toEqual({ TableDescription: { TableName: "TestTable" } });
  });

  test("should add item to DynamoDB table", async () => {
    mockSend.mockResolvedValue({});
    
    const item = {
      postId: "123",
      creationDate: "2025-02-08",
      type: "post",
      subType: "article",
      categories: ["Tech", "AI"],
      requestedAmount: "1000",
      reward: "500",
      submitter: "JohnDoe",
      vectorFileId: "vector123",
      docsLinks: ["http://example.com/doc1"],
      post: { title: "AI Trends", content: "Future of AI..." },
    };
    
    const response = await dynamoDBService.addItemToTable("TestTable", item);
    
    expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
    expect(response).toEqual({});
  });

  test("should update item in DynamoDB table", async () => {
    mockSend.mockResolvedValue({ Attributes: { postId: "123", type: "post" } });
    
    const item = {
      postId: "123",
      creationDate: "2025-02-08",
      type: "post",
      subType: "article",
      categories: ["Tech", "AI"],
      requestedAmount: "1000",
      reward: "500",
      submitter: "JohnDoe",
      vectorFileId: "vector123",
      docsLinks: ["http://example.com/doc1"],
      post: { title: "AI Trends", content: "Future of AI..." },
    };
    
    const response = await dynamoDBService.updateItemIntoTable("TestTable", item);
    
    expect(mockSend).toHaveBeenCalledWith(expect.any(UpdateItemCommand));
    expect(response).toEqual({ Attributes: { postId: "123", type: "post" } });
  });
});
