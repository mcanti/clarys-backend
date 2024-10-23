import { injectable } from "inversify";
import axios from 'axios'

import { OnChainPostParamsInterface, PostByAddressParamsInterface, ListOnChainPostsParamsInterface } from '../interfaces/polkassembly.interface';

@injectable()
export class PolkassemblyService{

    async OnChainPost(
        params: OnChainPostParamsInterface
    ){
        try{

            const response  = await axios.get(`https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=${params.proposalType}&postId=${params.postId}`, {
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                }
            })
    
            if(response && response.data){
                return response.data;
            }

            return [];

        } catch(err){
            console.log('Error - OnChainPost: ', err);
            return [];
        }

    }

    async PostByAddress(
        params: PostByAddressParamsInterface
    ){
        try{

            const response  = await axios.get(`https://api.polkassembly.io/api/v1/listing/posts-by-address?proposerAddress=${params.proposerAddress}`, {
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                }
            })
    
            if(response && response.data){
                return response.data;
            }

            return [];

        } catch(err){
            console.log('Error - OnChainPost: ', err);
            return [];
        }

    }

    async ListOnChainPosts(
        params: ListOnChainPostsParamsInterface
    ){
        try{

            const response  = await axios.get(`https://api.polkassembly.io/api/v1/listing/on-chain-posts?page=${params.page}&proposalType=${params.proposalType}&listingLimit=${params.listingLimit}&trackNo=${params.trackNo}&trackStatus=${params.trackStatus}&sortBy=${params.sortBy}`, {
                maxBodyLength: Infinity,
                headers: {
                    'x-network': 'kusama'
                }
            })
    
            if(response && response.data){
                return response.data;
            }

            return [];

        } catch(err){
            console.log('Error - ListOnChainPosts: ', err);
            return [];
        }

    }

}