import { Config } from "../../config/config";
import { config as localConfig } from "../../config/local.config";
import { config as stagingConfig } from "../../config/staging.config";
import { config as prodConfig } from "../../config/production.config";

describe("Config Class", () => {
    let configInstance: Config;

    beforeEach(() => {
        jest.resetModules();
    });

    it("should return 'production' environment when NODE_ENV is set to 'production'", () => {
        process.env.NODE_ENV = "production";
        configInstance = new Config();
        
        expect(configInstance.getEnv()).toBe("production");
        expect(configInstance.getConfig()).toBe(prodConfig);
    });

    it("should return 'development' environment when NODE_ENV is set to 'development'", () => {
        process.env.NODE_ENV = "development";
        configInstance = new Config();
        
        expect(configInstance.getEnv()).toBe("development");
        expect(configInstance.getConfig()).toBe(localConfig);
    });

    it("should return 'staging' environment when NODE_ENV is set to 'staging'", () => {
        process.env.NODE_ENV = "staging";
        configInstance = new Config();
        
        expect(configInstance.getEnv()).toBe("staging");
        expect(configInstance.getConfig()).toBe(stagingConfig);
    });

    it("should return 'development' config as default when NODE_ENV is undefined", () => {
        delete process.env.NODE_ENV;
        configInstance = new Config();
        
        expect(configInstance.getEnv()).toBeUndefined();
        expect(configInstance.getConfig()).toBe(localConfig);
    });

    it("should return 'development' config as default when NODE_ENV is set to an unknown value", () => {
        process.env.NODE_ENV = "unknown-env";
        configInstance = new Config();
        
        expect(configInstance.getEnv()).toBe("unknown-env");
        expect(configInstance.getConfig()).toBe(localConfig);
    });
});
