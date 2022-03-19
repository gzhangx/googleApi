export interface IGClientCreds {
    client_id: string;
    client_secret: string;
}
export interface IRefresCreds extends IGClientCreds {
    refresh_token: string;
}
export declare function getFormData(obj: {
    [id: string]: any;
}): (string | null);
interface IIdRange {
    id: string;
    range: string;
}
declare type IAppendFunc = (idRng: IIdRange, data: any, opts?: any) => Promise<any>;
declare type IReadFunc = (idRng: IIdRange) => Promise<any>;
export interface IGoogleClient {
    access_token: string;
    expires_on: number;
    token_type: string;
    doBatchUpdate: (id: string, data: any) => Promise<any>;
    append: IAppendFunc;
    read: IReadFunc;
    getSheeOps: (id: string) => {
        doBatchUpdate: (data: any) => Promise<any>;
        append: (range: string, data: any, opts?: any) => Promise<any>;
        read: (range: string) => Promise<any>;
    };
}
export interface IGoogleToken {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
}
export declare function getTokenFromCode(creds: IGClientCreds, code: string, redirect_uri: string): Promise<IGoogleToken>;
export declare function getClient(creds: IRefresCreds): Promise<IGoogleClient>;
export declare function getClientCredsByEnv(envName: string): IGClientCreds;
export declare function getClientByEnv(envName: string): Promise<IGoogleClient>;
export declare function test(d: boolean): Promise<void>;
export {};
