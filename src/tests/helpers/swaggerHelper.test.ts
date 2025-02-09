import { SwaggerHelper } from "../../helpers/swaggerHelper";
import { ResponseWrapperCode } from "../../services/responseWrapper.service";

describe("SwaggerHelper", () => {
    let swaggerHelper: SwaggerHelper;
    let swaggerDocs: any;

    beforeEach(() => {
        swaggerHelper = new SwaggerHelper();
        swaggerDocs = { components: { schemas: {} } };
    });

    it("should add ResponseWrapperCode schema to swaggerDocs", () => {
        swaggerHelper.addSwaggerResponseSchema(swaggerDocs);

        expect(swaggerDocs.components.schemas).toHaveProperty("ResponseWrapperCode");
        expect(swaggerDocs.components.schemas.ResponseWrapperCode).toEqual(
            expect.objectContaining({
                type: "object",
                properties: {
                    code: {
                        type: "integer",
                        description: "Error code",
                        example: "0"
                    },
                    message: {
                        type: "string",
                        description: "Error message",
                        example: "Success"
                    }
                }
            })
        );
    });

    it("should include all static error codes in the schema description", () => {
        swaggerHelper.addSwaggerResponseSchema(swaggerDocs);
        const description = swaggerDocs.components.schemas.ResponseWrapperCode.description;

        expect(description).toContain("## Known error codes");
        expect(description).toContain(JSON.stringify(ResponseWrapperCode.ok));
        expect(description).toContain(JSON.stringify(ResponseWrapperCode.generalError));
        expect(description).toContain(JSON.stringify(ResponseWrapperCode.missingItem));
    });

    it("should maintain the correct schema format", () => {
        swaggerHelper.addSwaggerResponseSchema(swaggerDocs);

        expect(swaggerDocs.components.schemas.ResponseWrapperCode).toEqual(
            expect.objectContaining({
                type: "object",
                properties: expect.objectContaining({
                    code: expect.objectContaining({ type: "integer" }),
                    message: expect.objectContaining({ type: "string" })
                })
            })
        );
    });
});
