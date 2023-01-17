//import Axios, { AxiosRequestConfig } from "axios";
import { doHttpRequest, OutgoingHttpHeaders, HttpRequestMethod } from '../httpRequest';
//import * as  promise from 'bluebird';
import { get } from 'lodash';
import { getFormData} from '../util'
import { OutgoingHttpHeader } from 'http';

export type ILogger = (...args: any[]) => void;

type AxiosRequestConfig = {
    headers: OutgoingHttpHeaders,
}

function doHttpGet(url: string, opts: AxiosRequestConfig) {
    return doHttpRequest({
        method: 'GET',
        ...opts,
        url,
    })
}

function doHttpDelete(url: string, opts: AxiosRequestConfig) {
    return doHttpRequest({
        method: 'DELETE',
        ...opts,
        url,
    })
}

function doHttpPost(url: string, data: object, opts: AxiosRequestConfig) {
    return doHttpRequest({
        method: 'POST',
        ...opts,
        url,
        data,
    })
}

function doHttpPatch(url: string, data: object, opts: AxiosRequestConfig) {
    return doHttpRequest({
        method: 'PATCH',
        ...opts,
        url,
        data,
    })
}

export interface IMsGraphCreds {
    //userId: string;
    tenantId: string;
    client_id: string;

    scope?: string;
    refresh_token: string;
    logger: ILogger;
    loadTokenCache?: () => Promise<ITokenInfoCache>;
    saveTokenCache?: (cache: ITokenInfoCache) => Promise<void>;
}

export type IRefreshTokenPromptUser = (msg: string, info: ICodeWaitInfo) => void;
export type IRefreshTokenSaveToken = (token: IRefreshTokenResult) => Promise<void>;

export interface IAuthOpt extends IMsGraphCreds {
    //tenantId: string;
    //client_id: string;
    //refresh_token: string; //optional
    //promptUser: (msg: string, info: ICodeWaitInfo) => void;
    //saveToken: (token: IRefreshTokenResult) => Promise<void>;
    pollTime?: number;
}

export interface IRefreshTokenResult {
    token_type: 'Bearer';
    scope: string;
    expires_in: number;
    ext_expires_in: string;
    expires_on: string;
    not_before: string;
    resource: 'https://graph.microsoft.com',
    access_token: string;
    refresh_token: string;
    id_token: string;
    error?: string;
}

export interface ICodeWaitInfo {
    user_code: string;  //'short user string',
    device_code: string; //long device code
    verification_uri: string; //'https://microsoft.com/devicelogin',
    expires_in: number; //900
    interval: number; //5
    message: string; //'To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code user_code to authenticate.'
}

export interface ITokenInfo {
    access_token: string;
    expires_on: number;
}

interface ITokenInfoCache {
    [key: string]: ITokenInfo
}

export async function delay(ms: number) {
    return new Promise(resolve => {            
        setTimeout(() => {
            resolve(null);
        }, ms);
    });
}

export class GGraphError extends Error {
    requestUrl: string;
    constructor(requestUrl:string) {
        super('')
        this.requestUrl = requestUrl;
    }
}

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

export function getAuth(opt: IMsGraphCreds) {
    const tenantId = opt.tenantId;
    const client_id = opt.client_id;
    if (!tenantId) throw {
        message: 'tenantId required'
    }
    if (!client_id) throw {
        message: 'client_id required'
    }

    //const promptUser = opt.promptUser || ((msg: string, info: ICodeWaitInfo)=>console.log(msg,info));
    //const saveToken = opt.saveToken;
    
    const baseQueryUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
    const queryCodeurl = `${baseQueryUrl}/token`;

    
    async function doPost(url: string, data: { [id: string]: any }): Promise<object> {
        const dataStr = getFormData(data);
        return await doHttpRequest({url, data: dataStr, 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST'
        }).then(r => {
            return (r.data as object);
        });
    }

    const scope = opt.scope || 'offline_access Mail.Read openid profile User.Read email Files.ReadWrite.All Files.ReadWrite Files.Read Files.Read.All Files.Read.Selected Files.ReadWrite.AppFolder Files.ReadWrite.Selected';
    async function getRefreshTokenPart1GetCodeWaitInfo() {        
        const codeWaitInfo = await doPost(`${baseQueryUrl}/devicecode`, {
            scope,
            client_id,
        }) as ICodeWaitInfo;
        return codeWaitInfo;
    }
    async function getRefreshTokenPartFinish(deviceCode: string, saveToken: IRefreshTokenSaveToken, pollTime?: number, maxPollTime?: number): Promise<IRefreshTokenResult> {
        if (!maxPollTime) maxPollTime = 1000 * 120;
        if (!pollTime) pollTime = 1000;
        let totalWait = 0;
        while (totalWait < maxPollTime) {
            try {
                const rrOrError = await doPost(queryCodeurl, {
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                    //resource: 'https://graph.microsoft.com',
                    scope,
                    code: deviceCode,
                    client_id
                }) as IRefreshTokenResult;
                opt.logger('getRefreshTokenPartFinish got result ', rrOrError);
                if (rrOrError.error === 'authorization_pending') { //this no longer works with axios
                    opt.logger(`Waiting for deviceCode ${totalWait}/${maxPollTime}`, deviceCode);
                    //await promise.Promise.delay(opt.pollTime || 1000);                    
                    totalWait += pollTime;
                    await delay(pollTime);
                    continue;
                }
                const rr = rrOrError;
                ///console.log(rr);
                //const { access_token, refresh_token } = rr;
                //fs.writeFileSync('credentials.json', JSON.stringify(rr, null, 2));
                opt.logger('saving token for deviceCode', deviceCode);
                await saveToken(rr);
                return rr;
            } catch (err) {
                const errData = get(err, 'response.data');
                if (errData && errData.error === 'authorization_pending') {
                    opt.logger(`Waiting for deviceCode(err) ${totalWait}/${maxPollTime}`, deviceCode);
                    await delay(pollTime);
                    totalWait += pollTime;
                    continue;
                }
                opt.logger('getRefreshTokenPartFinish: other error happened', errData || err);
                throw err;
            }
        }
    }
    async function getRefreshToken(saveToken: IRefreshTokenSaveToken, promptUser:IRefreshTokenPromptUser) :Promise<IRefreshTokenResult> {        
        const codeWaitInfo = await getRefreshTokenPart1GetCodeWaitInfo();

        //const user_code = codeWaitInfo.user_code; // presented to the user
        const deviceCode = codeWaitInfo.device_code; // internal code to identify the user
        //const url = codeWaitInfo.verification_url; // URL the user needs to visit & paste in the code
        const message = codeWaitInfo.message; //send user code to url
        await promptUser(message, codeWaitInfo);
        return await getRefreshTokenPartFinish(deviceCode,saveToken);
    }

    async function getAccessToken(): Promise<IRefreshTokenResult> {
        const { refresh_token } = opt;
        const form = {
            scope,
            refresh_token,
            grant_type: 'refresh_token',
            client_id
        };
        const ac = await doPost(queryCodeurl, form) as IRefreshTokenResult;

        return ac;
    }

    //getAuth({tenantId, client_id, promptUser, saveToken, loadToken})
    return {
        getRefreshToken,
        getAccessToken,

        refreshTokenSeperated: {
            getRefreshTokenPart1GetCodeWaitInfo,
            getRefreshTokenPartFinish,
        }
    }
}


export interface IMsGraphOps {
    getMsGraphBaseUrl: (urlPostFix: string) => string;
    getHeaders: () => Promise<AxiosRequestConfig>;
    parseResp: (r: { data: any }) => any;
    doGet: (urlPostFix: string, fmt?: (cfg: AxiosRequestConfig) => AxiosRequestConfig) => Promise<any>;
    doPost: (urlPostFix: string, data: object) => Promise<any>;
    doPut: (urlPostFix: string, data: object) => Promise<any>;
    doPatch: (urlPostFix: string, data: object) => Promise<any>;
    doDelete: (urlPostFix: string) => Promise<any>;
    getSharedItemInfo: (sharedUrl: string) => Promise<IDriveItemInfo>;
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


const connCaccheInfo = {
    cache: null as ITokenInfoCache,
};
export async function getMsGraphConn(opt: IMsGraphCreds): Promise<IMsGraphOps> {    
    async function getToken(): Promise<ITokenInfo> {
        const now = Math.round(new Date().getTime()/1000);
        const cacheKey = `${opt.tenantId}-${opt.client_id}`;
        if (!connCaccheInfo.cache) {
            if (opt.loadTokenCache) connCaccheInfo.cache = await opt.loadTokenCache();
            else connCaccheInfo.cache = {};
        }
        const optTokenInfo = connCaccheInfo.cache[cacheKey];
        opt.logger(`debugrm getMsGraphConn now=${now} exp=${optTokenInfo?.expires_on}`);
        if (!optTokenInfo || optTokenInfo.expires_on < now) {
            const { getAccessToken } = getAuth(opt);
            opt.logger('getting new token');
            const tok = await getAccessToken();
            console.log('------------------------>', tok)
            const retToken = {
                access_token: tok.access_token,
                expires_on: tok.expires_in + now,
            };
            connCaccheInfo.cache[cacheKey] = retToken;
            if (opt.saveTokenCache) {
                opt.logger('saving token cache');
                await opt.saveTokenCache(connCaccheInfo.cache);
            }
            return retToken;
        }
        return optTokenInfo;
    }

    async function getHeaders(): Promise<AxiosRequestConfig> {
        const tok = await getToken();
        return {
            headers: {
                "Authorization": `Bearer ${tok.access_token}`
            },
            //maxContentLength: Infinity,
            //maxBodyLength: Infinity,
        };
    }

    function parseResp(r: { data: any }) {        
        return r.data;
    }

    function errProc(errTrace: GGraphError) {
        return err => {
            const message = axiosErrorProcessing(err);
            opt.logger(`error on ${errTrace.requestUrl}: ${message}`);
            errTrace.message = err.message;
            throw errTrace;
        }
    }

    const getMsGraphBaseUrl = (urlPostFix: string) => `${ROOT_URL}/${urlPostFix}`;

    async function doGet(urlPostFix: string, fmt: (cfg: AxiosRequestConfig) => AxiosRequestConfig = x => x): Promise<any> {
        const uri = getMsGraphBaseUrl(urlPostFix);
        opt.logger(`GET ${uri}`);
        return await doHttpGet(uri, fmt(await getHeaders()))
            .then(parseResp).catch(errProc(new GGraphError(uri)));
    }

    async function doPost(urlPostFix: string, data: object) {
        const uri = getMsGraphBaseUrl(urlPostFix);
        opt.logger(`POST ${uri}`);
        return doHttpPost(uri, data, await getHeaders()).then(parseResp).catch(errProc(new GGraphError(uri)));
    }

    async function doPut(urlPostFix: string, data: object) {
        const uri = getMsGraphBaseUrl(urlPostFix);
        opt.logger(`PUT ${uri}`);
        return doHttpPost(uri, data, await getHeaders()).then(parseResp).catch(errProc(new GGraphError(uri)));
    }

    async function doPatch(urlPostFix: string, data: object) {
        const uri = getMsGraphBaseUrl(urlPostFix);
        opt.logger(`PATCH ${uri}`);
        return doHttpPatch(uri, data, await getHeaders()).then(parseResp).catch(errProc(new GGraphError(uri)));
    }

    async function doDelete(urlPostFix: string) {
        const uri = getMsGraphBaseUrl(urlPostFix);
        opt.logger(`PATCH ${uri}`);
        return doHttpDelete(uri, await getHeaders()).then(parseResp).catch(errProc(new GGraphError(uri)));
    }

    const ROOT_URL = 'https://graph.microsoft.com/v1.0';
    //const getMsGraphBaseUrl = (urlPostFix: string) => `${ROOT_URL}/users('${opt.tenantClientInfo.userId}')/${urlPostFix}`;    

    async function getSharedItemInfo(sharedUrl: string): Promise<IDriveItemInfo> {
        return doGet(`shares/${encodeSharedUrl(sharedUrl)}/driveItem`).then((r: IDriveItemInfo) => {
            return r;
        });        
    }
    return {
        getMsGraphBaseUrl,
        getHeaders,
        parseResp,
        doGet,
        doPost,
        doPut,
        doPatch,
        doDelete,
        getSharedItemInfo,
    }
}