import { SubmitedMeetUpsParamsInterface } from "../../interfaces/dotMeetUp.interfaces";

// Mock the module
jest.mock("../../interfaces/dotMeetUp.interfaces", () => ({
  SubmitedMeetUpsParamsInterface: jest.fn(() => ({
    src: "mocked-url",
  })),
}));

describe("SubmitedMeetUpsParamsInterface Mock", () => {
  test("should create a mock with a predefined src", () => {
    const mockParams: SubmitedMeetUpsParamsInterface = {
      src: "mocked-url",
    };

    expect(mockParams).toBeDefined();
    expect(mockParams.src).toBe("mocked-url");
  });

  test("should allow overriding the src value", () => {
    const mockParams: SubmitedMeetUpsParamsInterface = {
      src: "new-url",
    };

    expect(mockParams.src).toBe("new-url");
  });
});
