import { injectable } from "inversify";
import axios from 'axios';
import https from 'https';

import { OnChainPostParamsInterface, PostByAddressParamsInterface, ListOnChainPostsParamsInterface, AllOpenGovPostsInterface } from '../interfaces/polkassembly.interface';

@injectable()
export class PolkassemblyService {

    async OnChainPost(params: OnChainPostParamsInterface) {
        try {
            const response = await axios.get(`https://api.polkassembly.io/api/v1/posts/on-chain-post`, {
                params: {
                    proposalType: params.proposalType,
                    postId: params.postId
                },
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                }, 
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore SSL certificate errors
                })

            });

            return response.data || [];
        } catch (err) {
            console.log('Error - OnChainPost: ', err);
            return [];
        }
    }

    async PostByAddress(params: PostByAddressParamsInterface) {
        try {
            const response = await axios.get(`https://api.polkassembly.io/api/v1/listing/posts-by-address`, {
                params: {
                    proposerAddress: params.proposerAddress
                },
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore SSL certificate errors
                })
            });

            return response.data || [];
        } catch (err) {
            console.log('Error - PostByAddress: ', err);
            return [];
        }
    }

    async ListOnChainPosts(params: ListOnChainPostsParamsInterface) {
        try {
            const { trackNo, ...otherParams } = params;

            const response = await axios.get(`https://api.polkassembly.io/api/v1/listing/on-chain-posts`, {
                params: {
                    ...otherParams,
                    trackNo: trackNo !== undefined ? trackNo : null
                },
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore SSL certificate errors
                })
            });

            return response.data || [];
        } catch (err) {
            console.log('Error - ListOnChainPosts: ', err);
            return [];
        }
    }

    async AllOpenGovPosts(params: AllOpenGovPostsInterface) {
        try {
            const response = await axios.get(`https://api.polkassembly.io/api/v1/latest-activity/all-posts`, {
                params: {
                    govType: params.govType
                },
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false // Ignore SSL certificate errors
                })
            });

            return response.data || [];
        } catch (err) {
            console.log('Error - AllOpenGovPosts: ', err);
            return [];
        }
    }
}
