import { UtilityController } from "../../controllers/utility.controller";
import { Response } from "express";
import { ResponseWrapperCode } from "../../services/responseWrapper.service";

describe("UtilityController", () => {
  let utilityController;
  let mockResponse;

  beforeEach(() => {
    utilityController = new UtilityController();
    mockResponse = {
      apiSuccess: jest.fn(),
      apiError: jest.fn().mockImplementation(() => ResponseWrapperCode.generalError),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return the current date", async () => {
    const result = utilityController._getCurrentDate();
    expect(new Date(result).toString()).not.toBe("Invalid Date");
  });

  test("should handle getCurrentDate successfully", async () => {
    await utilityController.getCurrentDate(mockResponse);
    expect(mockResponse.apiSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        currentDate: expect.any(String),
      })
    );
  });

  test("should handle errors in getCurrentDate", async () => {
    jest.spyOn(utilityController, "_getCurrentDate").mockImplementation(() => {
      throw new Error("Test Error");
    });

    await utilityController.getCurrentDate(mockResponse);

    expect(mockResponse.apiError).toHaveBeenCalledWith(ResponseWrapperCode.generalError);
  });
});
