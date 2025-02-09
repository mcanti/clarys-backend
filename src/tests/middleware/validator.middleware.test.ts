import { validateSchema } from "../../middleware/validator.middleware";
import { checkSchema, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

jest.mock("express-validator", () => ({
  checkSchema: jest.fn(() => [(req, res, next) => next()]),
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(),
    array: jest.fn(),
  })),
}));

describe("validateSchema middleware", () => {
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

    jest.clearAllMocks();
  });

  it("should call next() when there are no validation errors", async () => {
    (validationResult as unknown as jest.Mock).mockImplementation(() => ({
      isEmpty: jest.fn(() => true),
      array: jest.fn(() => []),
    }));

    const middleware = validateSchema({});
    await middleware[1](req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.apiError).not.toHaveBeenCalled();
  });

  it("should call res.apiError when validation errors exist", async () => {
    (validationResult as unknown as jest.Mock).mockImplementation(() => ({
      isEmpty: jest.fn(() => false),
      array: jest.fn(() => [{ msg: "Invalid params" }]),
    }));

    const middleware = validateSchema({});
    await middleware[1](req as Request, res as Response, next);

    expect(res.apiError).toHaveBeenCalledWith({
      code: 4001,
      message: "Invalid params",
      details: [{ msg: "Invalid params" }],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
