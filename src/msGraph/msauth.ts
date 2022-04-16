import Axios, { AxiosRequestConfig } from "axios";
//import * as  promise from 'bluebird';
import { get } from 'lodash';
import { getFormData} from '../util'

export interface IMsGraphCreds {
    //userId: string;
    tenantId: string;
    client_id: string;

    refresh_token: string;
}

export interface IAuthOpt extends IMsGraphCreds {
    //tenantId: string;
    //client_id: string;
    //refresh_token: string; //optional
    promptUser: (msg: string|object, info:object) => void;
    saveToken: (token: object) => Promise<void>;
    scope?: string;
    pollTime?: number;
}

interface ICodeWaitInfo {
    device_code: string;
    message: object;
}

export interface ITokenInfo {
    access_token: string;
    expires_on: number;
}

async function delay(ms: number) {
    return new Promise(resolve => {            
        setTimeout(() => {
            resolve(null);
        }, ms);
    });
}

export function GGraphError(message = "") {
    this.name = "GGraphError";
    this.message = message;
}
GGraphError.prototype = Error.prototype;

export function encodeSharedUrl(sharingUrl: string): string {
    //see https://docs.microsoft.com/en-us/graph/api/shares-get?view=graph-rest-1.0&irgwc=1&OCID=AID2200057_aff_7593_1243925&tduid=(ir__ksd0kmgl9ckf6nyskg6fwnqce32xt3umkhw9f9gn00)(7593)(1243925)(je6NUbpObpQ-XTpQa0NuXTfWX1VU38TMYg)()&irclickid=_ksd0kmgl9ckf6nyskg6fwnqce32xt3umkhw9f9gn00&tabs=http#encoding-sharing-urls&ranMID=24542&ranEAID=je6NUbpObpQ&ranSiteID=je6NUbpObpQ-XTpQa0NuXTfWX1VU38TMYg&epi=je6NUbpObpQ-XTpQa0NuXTfWX1VU38TMYg   
    const base64Value = Buffer.from(sharingUrl).toString('base64');
    //string encodedUrl = "u!" + base64Value .TrimEnd('=').Replace('/', '_').Replace('+', '-');
    const encodedUrl = base64Value.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
    const resUrl = `u!${encodedUrl}`;
    return resUrl;
}

export interface IDriveItemInfo {
    id: string;
    //lastModifiedDateTime: string;
    name: string;
    //webUrl: string;    
    //size: number;
    //"createdBy":     
    //"lastModifiedBy"
    parentReference: {
        driveId: string;
        //driveType: string; // "documentLibrary",
        id: string;
        //path: string;"/drives/b!hXChu0dhsUaKN7pqt1bD3_OeafGaVT1FohEO2dBMjAY5XO0eLYVxS7CH5lgurhQd/root:/新人资料"
    };    
    //folder: {
    //    childCount: number;
    //};
}

export function getAuth(opt: IAuthOpt) {
    const tenantId = opt.tenantId;
    const client_id = opt.client_id;
    if (!tenantId) throw {
        message: 'tenantId required'
    }
    if (!client_id) throw {
        message: 'client_id required'
    }

    const promptUser = opt.promptUser || console.log;
    const saveToken = opt.saveToken;

    const resource = 'https://graph.microsoft.com';
    const scope = opt.scope || 'Mail.Read openid profile User.Read email Files.ReadWrite.All Files.ReadWrite Files.Read Files.Read.All Files.Read.Selected Files.ReadWrite.AppFolder Files.ReadWrite.Selected';
    const queryCodeurl = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;

    
    async function doPost(url: string, data: { [id: string]: any }): Promise<any> {
        const dataStr = getFormData(data);
        return await Axios.post(url, dataStr, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(r => {
            return (r.data);
        });
    }
    async function getRefreshToken() {        
        const codeWaitInfo = await doPost(`https://login.microsoftonline.com/${tenantId}/oauth2/devicecode`, {
            resource,
            scope,
            client_id,
        }) as ICodeWaitInfo;

        //const user_code = codeWaitInfo.user_code; // presented to the user
        const deviceCode = codeWaitInfo.device_code; // internal code to identify the user
        //const url = codeWaitInfo.verification_url; // URL the user needs to visit & paste in the code
        const message = codeWaitInfo.message; //send user code to url
        await promptUser(message, codeWaitInfo);
        while (true) {
            const rr = await doPost(queryCodeurl, {
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                resource: 'https://graph.microsoft.com',
                scope,
                code: deviceCode,
                client_id
            });
            if (rr.error === 'authorization_pending') {
                //await promise.Promise.delay(opt.pollTime || 1000);
                await delay(opt.pollTime || 1000);
                continue;
            }
            ///console.log(rr);
            //const { access_token, refresh_token } = rr;
            //fs.writeFileSync('credentials.json', JSON.stringify(rr, null, 2));
            await saveToken(rr);
            return rr;
        }
    }

    async function getAccessToken(): Promise<ITokenInfo> {
        const { refresh_token } = opt;
        const form = {
            scope,
            resource,
            refresh_token,
            grant_type: 'refresh_token',
            client_id
        };
        const ac = await doPost(queryCodeurl, form) as ITokenInfo;

        return ac;
    }

    //getAuth({tenantId, client_id, promptUser, saveToken, loadToken})
    return {
        getRefreshToken,
        getAccessToken,
    }
}


export function getDefaultAuth(opt: IMsGraphCreds) {
    const { tenantId, client_id, refresh_token } = opt;
    return getAuth({
        tenantId,
        client_id,
        refresh_token,
        promptUser: msg => console.log(msg),
        saveToken: async res => console.log(res),        
    });
}



export interface IMsGraphConn {
    tenantClientInfo: IMsGraphCreds;
    tokenInfo?: ITokenInfo;
    logger: (msg: string) => void;
}

export interface IMsGraphOps {
    doGet: (urlPostFix: string, fmt?: (cfg: AxiosRequestConfig) => AxiosRequestConfig) => Promise<any>;
    doPost: (urlPostFix: string, data: object) => Promise<any>;
    doPut: (urlPostFix: string, data: object) => Promise<any>;
    doPatch: (urlPostFix: string, data: object) => Promise<any>;
    getSharedItemInfo: (sharedUrl: string) => Promise<IDriveItemInfo>;
}

export type ILogger = (msg: string) => void;

export async function getDefaultMsGraphConn(tenantClientInfo: IMsGraphCreds, logger: ILogger = x=>console.log(x)): Promise<IMsGraphOps> {
    return getMsGraphConn({
        tenantClientInfo,
        tokenInfo: null,
        logger,
    });
}

export function axiosErrorProcessing(err: any) : string {
    function doSteps(obj: object, initialMsg: string, steps: string[]) : string {
        const msg = steps.reduce((acc, step) => {
            const cur = get(acc.obj, step) as string;
            if (typeof cur === 'string') {
                if (acc.msg)
                    acc.msg = `${acc.msg} ${cur}`;
                else
                    acc.msg = cur;
            }
            return acc;
        }, {
            obj,
            msg: initialMsg
        });
        return msg.msg;
    }
    const steps = ['response.data.message', 'response.data.error.message'];
    const msg = doSteps(err, err.message, steps);
    return msg;
}

export async function getMsGraphConn(opt: IMsGraphConn): Promise<IMsGraphOps> {    
    async function getToken(): Promise<ITokenInfo> {
        const now = new Date().getTime();
        opt.logger(`debugrm getMsGraphConn now=${now} exp=${opt.tokenInfo?.expires_on}`);
        if (!opt.tokenInfo || opt.tokenInfo.expires_on < now / 1000) {
            const { getAccessToken } = getDefaultAuth(opt.tenantClientInfo);
            opt.logger('getting new token');
            const tok = await getAccessToken();
            opt.tokenInfo = tok;
        }
        return opt.tokenInfo;
    }

    async function getHeaders(): Promise<AxiosRequestConfig> {
        const tok = await getToken();
        return {
            headers: {
                "Authorization": `Bearer ${tok.access_token}`
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        };
    }

    function parseResp(r: { data: any }) {        
        return r.data;
    }

    function errProc(context: string) {
        return err => {
            const message = axiosErrorProcessing(err);
            opt.logger(`error on ${context}: ${message}`);
            throw new GGraphError(message);
        }
    }
    async function doGet(urlPostFix: string, fmt: (cfg: AxiosRequestConfig) => AxiosRequestConfig = x => x): Promise<any> {
        const uri = getUserUrl(urlPostFix);
        opt.logger(`GET ${uri}`);
        return await Axios.get(uri, fmt(await getHeaders()))
            .then(parseResp).catch(errProc(uri));
    }

    async function doPost(urlPostFix: string, data: object) {
        const uri = getUserUrl(urlPostFix);
        opt.logger(`POST ${uri}`);
        return Axios.post(uri, data, await getHeaders()).then(parseResp).catch(errProc(uri));
    }

    async function doPut(urlPostFix: string, data: object) {
        const uri = getUserUrl(urlPostFix);
        opt.logger(`PUT ${uri}`);
        return Axios.put(uri, data, await getHeaders()).then(parseResp).catch(errProc(uri));
    }

    async function doPatch(urlPostFix: string, data: object) {
        const uri = getUserUrl(urlPostFix);
        opt.logger(`PATCH ${uri}`);
        return Axios.patch(uri, data, await getHeaders()).then(parseResp).catch(errProc(uri));
    }

    const ROOT_URL = 'https://graph.microsoft.com/v1.0';
    //const getUserUrl = (urlPostFix: string) => `${ROOT_URL}/users('${opt.tenantClientInfo.userId}')/${urlPostFix}`;
    const getUserUrl = (urlPostFix: string) => `${ROOT_URL}/${urlPostFix}`;

    async function getSharedItemInfo(sharedUrl: string): Promise<IDriveItemInfo> {
        return doGet(`shares/${encodeSharedUrl(sharedUrl)}/driveItem`).then((r: IDriveItemInfo) => {
            return r;
        });        
    }
    return {
        doGet,
        doPost,
        doPut,
        doPatch,
        getSharedItemInfo,
    }
}