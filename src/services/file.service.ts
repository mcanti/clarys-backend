import { injectable } from "inversify";
import * as fs from "fs";
import * as path from "path";

@injectable()
export class FileService {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.resolve(__dirname, "../../../data");
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(this.filePath, { recursive: true });
    }
  }

  /**
   * @param fileName
   * @returns
   */
  private ensureJsonExtension(fileName: string): string {
    return fileName.endsWith(".json") ? fileName : `${fileName}.json`;
  }

  /**
   * Ensures the provided file name has a `.docx` extension.
   * @param fileName - The name of the file to check.
   * @returns The file name with a `.docx` extension.
   */
  private ensureDocxExtension(fileName: string): string {
    return fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  }

  /**
   * @param fileName
   * @param data
   */
  async saveDataToFile(
    fileName: string,
    data: any,
    dataTypeBuffer?: boolean
  ): Promise<void> {
    this.ensureDirectoryExists();

    let file;

    if (dataTypeBuffer) {
      file = path.join(this.filePath, this.ensureDocxExtension(fileName));
    } else {
      file = path.join(this.filePath, this.ensureJsonExtension(fileName));
    }

    if (dataTypeBuffer) {
      return new Promise((resolve, reject) => {
        fs.writeFile(file, data, (err) => {
          if (err) {
            reject(new Error(`Failed to save file: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data, null, 2), "utf8", (err) => {
          if (err) {
            reject(new Error(`Failed to save file: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    }
  }
}
