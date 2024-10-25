import { injectable } from 'inversify';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class FileService {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(__dirname, '../../data');
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
        return fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    }

    /**
     * @param fileName
     * @param data
     */
    async saveDataToFile(fileName: string, data: any): Promise<void> {
        this.ensureDirectoryExists();

        const file = path.join(this.filePath, this.ensureJsonExtension(fileName));

        return new Promise((resolve, reject) => {
            fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8', (err) => {
                if (err) {
                    reject(new Error(`Failed to save file: ${err.message}`));
                } else {
                    resolve();
                }
            });
        });
    }
   
}
