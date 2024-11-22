import { injectable } from "inversify";
import axios from "axios";
import https from "https";
import { SubmitedMeetUpsParamsInterface } from "../interfaces/dotMeetUp.interfaces";

@injectable()
export class DotMeetUpService {
  async getSubmitedMeetUps(params: SubmitedMeetUpsParamsInterface) {
    try {
        const data = {
            source: {
              type: "collection",
              id: "89304c29-f60d-449c-b7e1-75f7de823910",
              spaceId: "0146702f-920c-45f8-8f69-4f939e75319d",
            },
            collectionView: {
              id: "5f19a223-ebd4-41f8-8506-0b0fc0557fc3",
              spaceId: "0146702f-920c-45f8-8f69-4f939e75319d",
            },
            loader: {
              reducers: {
                collection_group_results: {
                  type: "results",
                  limit: 50,
                },
              },
              sort: [],
              searchQuery: "",
              userTimeZone: "Europe/Bucharest",
            },
          };
      const response = await axios.post(
        `https://dotmeetup.notion.site/api/v3/queryCollection${params?.src ? `?src=${params?.src}`:''}`,
        data,
        {
          headers: {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9,ro;q=0.8',
            'content-type': 'application/json',
            'cookie': 'device_id=146d872b-594c-8184-ad58-003b9272b394; notion_check_cookie_consent=true; NEXT_LOCALE=en-US; notion_experiment_device_id=ccbe8b5c-f836-4b61-b236-f2d5e4fbbfbf; notion_locale=en-US/autodetect',
            'notion-audit-log-platform': 'web',
            'notion-client-version': '23.13.0.763',
            'origin': 'https://dotmeetup.notion.site',
            'priority': 'u=1, i',
            'referer': 'https://dotmeetup.notion.site/d6e782e9fd614487a80ee73b1ba94ccf?v=5f19a223ebd441f885060b0fc0557fc3',
            'sec-ch-ua': '"Chromium";v="130", "Microsoft Edge";v="130", "Not?A_Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            'x-notion-active-user-header': '',
            'x-notion-space-id': '0146702f-920c-45f8-8f69-4f939e75319d',
          },
          maxBodyLength: Infinity,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false, // Ignore SSL certificate errors
          }),
        }
      );

      return response.data ?? null;
    } catch (err) {
      console.log("Error - getSubmitedMeetUps: ", err);
      return [];
    }
  }
}
