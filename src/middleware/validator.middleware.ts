import { checkSchema, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateSchema = (schema): any => {
    return [
        ...checkSchema(schema),
        (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.apiError({
                    code: 4001,
                    message: 'Invalid params',
                    details: errors.array(),
                });
            }
            next();
        }
    ];
};
