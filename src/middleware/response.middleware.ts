import { Request, Response, NextFunction } from "express";
import ApiResponse, { ResponseWrapperCode } from "../services/responseWrapper.service";

declare module 'express' {
    interface Response {
        apiSuccess(data?: any, message?: string): void;
        apiError(error: ResponseWrapperCode, status?: number, details?: any): void;
    }
}

export const responseWrapper = (
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    res.apiSuccess = (data?: any, message?: string): void => {
        const apiResponse = new ApiResponse(ResponseWrapperCode.ok, data, message);
        res.status(200).json(apiResponse);
    };

    res.apiError = (error: ResponseWrapperCode, status = 400, details?: any): void => {
        const apiResponse = new ApiResponse(error, details);
        res.status(status).json(apiResponse);
    };

    next();
};
