import { GoogleServicesInterface, GoogleAPIConfigInterface } from "../../interfaces/google.interfaces";

// Mock the module
jest.mock("../../interfaces/google.interfaces", () => ({
  GoogleServicesInterface: jest.fn<GoogleServicesInterface, []>(() => ({
    downloadFile: jest.fn().mockResolvedValue(undefined), // Mock async function
  })),
  GoogleAPIConfigInterface: jest.fn<GoogleAPIConfigInterface, []>(() => ({
    clientId: "mock-client-id",
    clientSecret: "mock-client-secret",
    redirectUri: "mock-redirect-uri",
    accessToken: "mock-access-token",
  })),
}));

describe("GoogleServicesInterface Mock", () => {
  test("should mock the downloadFile function", async () => {
    const mockGoogleService: GoogleServicesInterface = {
      downloadFile: jest.fn().mockResolvedValue(undefined),
    };

    await expect(mockGoogleService.downloadFile("file123", "/path/to/destination")).resolves.toBeUndefined();
    expect(mockGoogleService.downloadFile).toHaveBeenCalledWith("file123", "/path/to/destination");
  });
});

describe("GoogleAPIConfigInterface Mock", () => {
  test("should create a mock config with predefined values", () => {
    const mockConfig: GoogleAPIConfigInterface = {
      clientId: "mock-client-id",
      clientSecret: "mock-client-secret",
      redirectUri: "mock-redirect-uri",
      accessToken: "mock-access-token",
    };

    expect(mockConfig.clientId).toBe("mock-client-id");
    expect(mockConfig.clientSecret).toBe("mock-client-secret");
    expect(mockConfig.redirectUri).toBe("mock-redirect-uri");
    expect(mockConfig.accessToken).toBe("mock-access-token");
  });
});
