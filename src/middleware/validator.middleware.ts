import {checkSchema, validationResult} from 'express-validator';

export const validateSchema = (schema): any => {
    return [
        ...checkSchema(schema),
        (req, res, next)=>{
            const errors = validationResult(req);
            if(!errors.isEmpty()){
                return res.apiError({
                    code: 4001,
                    message: 'Invalid params',
                    details: errors
                })
            }
        }
    ]
}