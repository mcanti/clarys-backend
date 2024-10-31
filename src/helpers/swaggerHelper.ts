import { ResponseWrapperCode } from "../services/responseWrapper.service";

export class SwaggerHelper {

    addSwaggerResponseSchema(swaggerDocs: any){
        swaggerDocs.components.schemas = [];
        swaggerDocs.components.schemas['ResponseWrapperCode'] = {
            type: 'object',
            properties: {
                code: {
                    type: 'integer',
                    description: 'Error code',
                    example: '0'
                },
                message: {
                    type: 'string',
                    description: 'Error message',
                    example: 'Success'
                }
            },
            description: '## Known error codes\n'
        }

        const statics = Object.keys(ResponseWrapperCode);
        for(let i=0; i< statics.length; i++){
            const key = statics[i];
            const value = ResponseWrapperCode[key];
            if(value instanceof ResponseWrapperCode){
                const test = JSON.stringify(value);
                swaggerDocs.components.schemas['ResponseWrapperCode'].description += '\n ### '+test;
            }
        }
    }
}