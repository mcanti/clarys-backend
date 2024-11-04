import { injectable } from "inversify";
import axios from 'axios';
import https from 'https';

@injectable()
export class DotEventsService {

    async SubmissionsEvents() {
        try {
            const response = await axios.get(`https://view.monday.com/board_data/1538172273-feb12b3a30d6457f7d4ecc9f35054c0b.json?allow_edit=false&r=euc1`, {
             
                maxBodyLength: Infinity,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore SSL certificate errors
                })
            });

            return response.data || [];
        } catch (err) {
            console.log('Error - SubmissionsEvents: ', err);
            return [];
        }
    }
}
