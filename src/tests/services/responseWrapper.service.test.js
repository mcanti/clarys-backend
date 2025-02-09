import ApiResponse, { ResponseWrapperCode } from '../../services/responseWrapper.service';

describe('ResponseWrapperCode', () => {
    test('should have predefined static properties', () => {
        expect(ResponseWrapperCode.ok).toEqual(expect.any(ResponseWrapperCode));
        expect(ResponseWrapperCode.generalError).toEqual(expect.any(ResponseWrapperCode));
        expect(ResponseWrapperCode.missingItem).toEqual(expect.any(ResponseWrapperCode));
    });

    test('should have correct code and message', () => {
        expect(ResponseWrapperCode.ok.code).toBe(0);
        expect(ResponseWrapperCode.ok.message).toBe('Success');
        
        expect(ResponseWrapperCode.generalError.code).toBe(9001);
        expect(ResponseWrapperCode.generalError.message).toBe('General Error');
        
        expect(ResponseWrapperCode.missingItem.code).toBe(9003);
        expect(ResponseWrapperCode.missingItem.message).toBe('No such item');
    });

    test('should allow custom instances', () => {
        const customError = new ResponseWrapperCode(1001, 'Custom Error', { detail: 'Extra info' });
        expect(customError.code).toBe(1001);
        expect(customError.message).toBe('Custom Error');
        expect(customError.details).toEqual({ detail: 'Extra info' });
    });
});

describe('ApiResponse', () => {
    test('should create success response', () => {
        const data = { id: 1, name: 'Test' };
        const response = ApiResponse.generateSuccess(data, 'Operation successful');
        
        expect(response).toBeInstanceOf(ApiResponse);
        expect(response.errorCode).toEqual(ResponseWrapperCode.ok);
        expect(response.response).toEqual(data);
        expect(response.message).toBe('Operation successful');
    });

    test('should create error response', () => {
        const errorResponse = ApiResponse.generateError(ResponseWrapperCode.generalError, null, 'An error occurred');
        
        expect(errorResponse).toBeInstanceOf(ApiResponse);
        expect(errorResponse.errorCode).toEqual(ResponseWrapperCode.generalError);
        expect(errorResponse.response).toBeNull();
        expect(errorResponse.message).toBe('An error occurred');
    });

    test('should allow custom error codes in error response', () => {
        const customError = new ResponseWrapperCode(4004, 'Not Found');
        const response = ApiResponse.generateError(customError);
        
        expect(response.errorCode.code).toBe(4004);
        expect(response.errorCode.message).toBe('Not Found');
        expect(response.response).toBeUndefined();
        expect(response.message).toBeUndefined();
    });
});
