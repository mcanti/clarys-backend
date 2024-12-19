import { Response } from "express";
import {
  BaseHttpController,
  controller,
  httpGet,
  response,
} from "inversify-express-utils";
import { ResponseWrapperCode } from "../services/responseWrapper.service";

@controller("/api/utility")
export class UtilityController extends BaseHttpController {
    
  constructor() {
    super();
  }

    _getCurrentDate(){
    const currentDate = new Date;
    return currentDate.toUTCString();
  }

   /**
   * @swagger
   * /api/utility/getCurrentDate:
   *   get:
   *     tags:
   *       - Utility
   *     summary: Get Current Date
   *     responses:
   *       200:
   *         description: Get Current Date
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Internal server error
   */
   @httpGet("/getCurrentDate")
   async getCurrentDate(
     @response() res: Response,
   ) {
     try {
       const result = this._getCurrentDate();
 
       res.apiSuccess({
         currentDate : result,
       });
     } catch (err) {
       console.log("Error - getCurrentDate: ", err);
       res.apiError(ResponseWrapperCode.generalError);
     }
   }

}
