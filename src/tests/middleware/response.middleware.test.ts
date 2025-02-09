import { responseWrapper } from "../../middleware/response.middleware";
import ApiResponse, {
  ResponseWrapperCode,
} from "../../services/responseWrapper.service";
import { Request, Response, NextFunction } from "express";

// Mock ApiResponse class
jest.mock("../../services/responseWrapper.service", () => {
    class ApiResponse<T> {
      errorCode: ResponseWrapperCode;
      response?: T;
      message?: string;
  
      constructor(errorCode?: ResponseWrapperCode, response?: T, message?: string) {
        this.errorCode = errorCode;
        this.response = response;
        this.message = message;
      }
  
      static generateSuccess(response: any, message?: string) {
        return new ApiResponse(ResponseWrapperCode.ok, response, message);
      }
  
      static generateError(errorCode: ResponseWrapperCode, response?: any, message?: string) {
        return new ApiResponse(errorCode, response, message);
      }
    }
  
    class ResponseWrapperCode {
      static ok = new ResponseWrapperCode(0, "Success");
      static generalError = new ResponseWrapperCode(9001, "General Error");
      static missingItem = new ResponseWrapperCode(9003, "No such item");
  
      code: number;
      message?: string;
      details?: any;
  
      constructor(code: number, message?: string, details?: any) {
        this.code = code;
        this.message = message;
        this.details = details;
      }
    }
  
    return {
      __esModule: true,
      default: ApiResponse,
      ResponseWrapperCode,
    };
  });
  

describe("responseWrapper middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Partial<Request>;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      apiSuccess: jest.fn(),
      apiError: jest.fn(),
    } as Partial<Response>;

    next = jest.fn() as NextFunction;
  });

  it("should add apiSuccess and apiError methods to the response object", () => {
    responseWrapper(req as Request, res as Response, next);

    expect(typeof res.apiSuccess).toBe("function");
    expect(typeof res.apiError).toBe("function");
  });

  it("should call res.status(200) and res.json with ApiResponse when apiSuccess is called", () => {
    responseWrapper(req as Request, res as Response, next);

    const mockData = { key: "value" };
    const mockMessage = "Success message";

    res.apiSuccess(mockData, mockMessage);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: ResponseWrapperCode.ok,
        response: mockData,
        message: mockMessage,
      })
    );
  });

  it("should call res.status with the provided status and res.json with ApiResponse when apiError is called", () => {
    responseWrapper(req as Request, res as Response, next);

    const mockError = ResponseWrapperCode.generalError;
    const mockStatus = 500;
    const mockDetails = { error: "Something went wrong" };

    res.apiError(mockError, mockStatus, mockDetails);

    expect(res.status).toHaveBeenCalledWith(mockStatus);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: mockError,
        response: mockDetails,
      })
    );
  });

  it("should call next function", () => {
    responseWrapper(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
