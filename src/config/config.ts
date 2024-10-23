import {config as localConfig} from './local.config';
import {config as prodConfig} from './production.config';
import * as process from 'process';

export class Config{
    private readonly env:string;

    constructor(){
        this.env = process.env.NODE_ENV;
    }

    getEnv(){
        return this.env
    }

    getConfig(){
        switch(this.env){
            case 'production':
                return prodConfig;
            case 'development':
                return localConfig;
            default:
                return localConfig;
        }
    }
}