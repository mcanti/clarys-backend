export interface GoogleServicesInterface {
  downloadFile(fileId: string, destinationPath: string): Promise<void>;
}

export interface GoogleAPIConfigInterface {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    accessToken: string;
  }