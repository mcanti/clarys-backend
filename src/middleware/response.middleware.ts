import { Request, Response, NextFunction } from "express";
import ApiResponse, { ResponseWrapperCode } from "../helpers/responseWrapper.service";


declare module 'express' {
    interface Response{
        apiSuccess(data: any, message?: string);
        apiError(error: ResponseWrapperCode, status?: number, details?: any);
    }
}

export const responseWrapper = (
    req: Request, 
    res: Response, 
    next: NextFunction
)=>{
    res.apiSuccess = (data?: any, message?: string) =>{
        const apiResponse = new ApiResponse(ResponseWrapperCode.ok, data, message);
        res.status(200).json(apiResponse);
    }

    res.apiError = (error: ResponseWrapperCode, status = 400) =>{
        const apiResponse = new ApiResponse(error);
        res.status(200).json(apiResponse);
    }

    next();
}