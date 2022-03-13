export interface IRefresCreds {
    refresh_token: string;
    client_id: string;
    client_secret: string;
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
export declare function getClient(creds: IRefresCreds): Promise<IGoogleClient>;
export declare function getClientByEnv(envName: string): Promise<IGoogleClient>;
export declare function test(d: boolean): Promise<void>;
export {};
