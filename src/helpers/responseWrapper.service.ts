export class ResponseWrapperCode {
    static ok = new ResponseWrapperCode(0, 'Success');
    static generalError = new ResponseWrapperCode(9001, 'General Error');


    code: number;
    message?: string;

    constructor(code: number, message?: string){
        this.code = code;
        this.message = message
    }
}

class ApiResponse<T>{
    errorCode: ResponseWrapperCode;
    response: T;
    message?: string;

    constructor(errorCode: ResponseWrapperCode, response?: any, message?: string){
        this.errorCode = errorCode;
        this.response = response;
        this.message = message
    }

    static generateSuccess(response: any){
        return new ApiResponse(ResponseWrapperCode.ok, response);
    }

    static generateError(error_code: ResponseWrapperCode, response?:any){
        return new ApiResponse(error_code, response)
    }
}

export default ApiResponse;