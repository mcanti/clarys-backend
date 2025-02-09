import { config } from "../../config/local.config";

describe("Config Object", () => {
    it("should have the correct default values", () => {
        expect(config).toEqual({
            frontURL: '',
            region: 'us-east-1',
            s3: 'lucidaistorage',
            port: 3000
        });
    });

    it("should have a valid frontURL property", () => {
        expect(typeof config.frontURL).toBe("string");
    });

    it("should have a valid AWS region", () => {
        expect(config.region).toMatch(/^us-[a-z]+-\d+$/);
    });

    it("should have a valid S3 bucket name", () => {
        expect(typeof config.s3).toBe("string");
        expect(config.s3).not.toBe('');
    });

    it("should have a valid port number", () => {
        expect(typeof config.port).toBe("number");
        expect(config.port).toBeGreaterThan(0);
        expect(config.port).toBeLessThan(65536);
    });
});
