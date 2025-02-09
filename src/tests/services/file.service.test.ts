import { FileService } from "../../services/file.service";
import * as fs from "fs";
import * as path from "path";

jest.mock("fs");

describe("FileService", () => {
    let fileService: FileService;

    beforeEach(() => {
        fileService = new FileService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("saveDataToFile - With Mocking", () => {
        it("should save JSON data to a file with a .json extension", async () => {
            (fs.writeFile as unknown as jest.Mock).mockImplementation((_, __, ___, callback) => callback(null));

            const data = { key: "value" };
            await fileService.saveDataToFile("test-file", data, false);

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining("test-file.json"),
                JSON.stringify(data, null, 2),
                "utf8",
                expect.any(Function)
            );
        });

        it("should save buffer data to a file with a .docx extension", async () => {
            (fs.writeFile as unknown as jest.Mock).mockImplementation((_, __, callback) => callback(null));

            const bufferData = Buffer.from("Mock Binary Data");
            await fileService.saveDataToFile("test-doc", bufferData, true);

            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining("test-doc.docx"),
                bufferData,
                expect.any(Function)
            );
        });

        it("should handle errors during file writing", async () => {
            (fs.writeFile as unknown as jest.Mock).mockImplementation((_, __, ___, callback) => callback(new Error("Write error")));

            await expect(fileService.saveDataToFile("test-error", { key: "value" }, false))
                .rejects.toThrow("Failed to save file: Write error");
        });
    });
});
