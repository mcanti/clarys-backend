export class ResponseWrapperCode {
    static ok = new ResponseWrapperCode(0, 'Success');
    static generalError = new ResponseWrapperCode(9001, 'General Error');
    static missingItem = new ResponseWrapperCode(9003, 'No such item');

    code: number;
    message?: string;
    details?: any

    constructor(code: number, message?: string, details?: any) {
        this.code = code;
        this.message = message;
        this.details = details;
    }
}

class ApiResponse<T> {
    errorCode: ResponseWrapperCode;
    response?: T;
    message?: string;

    constructor(errorCode: ResponseWrapperCode, response?: T, message?: string) {
        this.errorCode = errorCode;
        this.response = response;
        this.message = message;
    }

    static generateSuccess<T>(response: T, message?: string): ApiResponse<T> {
        return new ApiResponse(ResponseWrapperCode.ok, response, message);
    }

    static generateError<T>(errorCode: ResponseWrapperCode, response?: T, message?: string): ApiResponse<T> {
        return new ApiResponse(errorCode, response, message);
    }
}

export default ApiResponse;
