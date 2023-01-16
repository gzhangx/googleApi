
//rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
//opts = { access_type: 'offline', scope: 'https://www.googleapis.com/auth/spreadsheets', response_type: 'code', client_id: 'client_id', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }
//return rootUrl + '?' + querystring.stringify(opts);
//'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&client_id=client_id&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob'

import { doHttpRequest, HttpRequestMethod } from './httpRequest';
import { getFormData } from './util'
import { pick } from 'lodash';
import jwt from 'jsonwebtoken';


export interface IServiceAccountCreds {
    private_key_id: string;
    private_key: string;    
    client_email: string;    
}

export interface IGoogleSheetGridProperties {
    rowCount: number;
    columnCount: number;
    frozenRowCount: number;
    frozenColumnCount: number;
}
interface IGoogleSheetInfo {
    spreadsheetId: string;
    properties: {
        title: string;
        locale: string;
        autoRecalc: string;//ON_CHANGE
        timeZone: string;// "America/New_York",
        defaultFormat: any;
    },
    sheets: {
        properties: {
            sheetId: number;
            title: string;
            index: number;
            sheetType: string; // "GRID",
            gridProperties: IGoogleSheetGridProperties
        };
    }[];
}

export interface ISheetInfoSimple extends IGoogleSheetGridProperties{
    sheetId: number;
    title: string;
    index: number; //not important,
};

//https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
export interface IGoogleUpdateParms {
    valueInputOption: 'INPUT_VALUE_OPTION_UNSPECIFIED' | 'RAW' | 'USER_ENTERED';
    includeValuesInResponse?: boolean;
    responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
    responseDateTimeRenderOption?: 'FORMATTED_STRING'|'SERIAL_NUMBER';
}



interface IIdRange {
    id: string; range: string;
}
type IAppendFunc = (idRng: IIdRange, data: any, opts?: any) => Promise<any>;
type IReadFunc = (idRng: IIdRange) => Promise<any>;
export interface IGoogleClient {
    getToken: () => string;
    doBatchUpdate: (id: string, data: any) => Promise<any>;
    append: IAppendFunc;
    read: IReadFunc;
    getSheetOps: (id: string) => {
        doBatchUpdate: (data: any) => Promise<any>;
        append: (range:string, data: any, opts?: any) => Promise<any>;
        read: (range: string) => Promise<any>;
        sheetInfo: ()=>Promise<ISheetInfoSimple[]>;
        createSheet: (sheetId: string, title: string)=>Promise<any>;
        updateValues: (range: string, values: string[][], opts?: IGoogleUpdateParms) => Promise<any>;
        addSheet: (title: string)=>Promise<any>;
    };
}

export interface IGoogleToken {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;  //'Bearer'
}

//old, does not need refresh token

function betterErr(desc: string) {
    return err => {
        const webRsp = err.response;
        if (webRsp) {
            throw {
                desc,
                ...pick(webRsp, ['data', 'status', 'statusText', 'headers', 'config.url'])
            }
        }
        throw err;
    }
}
export function getClient(creds: IServiceAccountCreds): IGoogleClient {
    if (!creds.private_key || !creds.private_key_id) throw `doRefresh needs private_key and private_key_id in creds`;
    if (!creds.client_email) throw `missing client_email from creds`;
    const curClientData = {
        expirationTime: 0,
        curToken: '',
    }
    
    const getToken = () => {
        const curTime = Math.floor(Date.now() / 1000);
        if (curClientData.curToken && curClientData.expirationTime < curTime) {
            return curClientData.curToken;
        }
        curClientData.curToken = jwt.sign({
            //"iss": cred.client_email,
            //"sub": cred.client_email,
            "aud": "https://sheets.googleapis.com/",
            //"iat": unixTime,
            //"exp": unixTime

            "typ": "JWT",
            "kid": creds.private_key_id,
        }, creds.private_key, {
            "algorithm": "RS256",
            //"type": "JWT",
            expiresIn: 3600,
            issuer: creds.client_email,
            subject: creds.client_email,
            //"kid": cred.private_key_id
        });
        curClientData.expirationTime = curTime + 3600 - 100;
        return curClientData.curToken;
    };
    const doOp = (op: HttpRequestMethod, id: string, postFix: string, data?: string | object) => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}${postFix}`;
        return doHttpRequest({
            url,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`,
            },
            method: op,
            data,
        }).then(r => {
            return (r)
        }).catch(betterErr(`doOps error ${url}`));
    }
    const doPost = (id:string, postFix:string, data:any) => doOp('POST', id, postFix, data);
    const doBatchUpdate = async (id:string, data:any) => doPost(id, ':batchUpdate', data);
    const append: IAppendFunc = async ({ id, range }, data, opts) => {
        if (!opts) {
            opts = {}
        }
        if (!opts.valueInputOption) opts.valueInputOption = 'USER_ENTERED';
        return await doPost(id, `/values/${range}:append?${getFormData(opts)}`, { values: data });
    };
    const read: IReadFunc = async ({ id, range }) => doOp('GET', id, `/values/${range}`);
    return {
        //access_token,
        //expires_on: new Date().getTime() + (expires_in * 1000 - 2000),
        //token_type,
        getToken,
        doBatchUpdate,
        append,
        read,
        getSheetOps: id => {
            const getInfo = () => doOp('GET', id, '') as Promise<IGoogleSheetInfo>;
            const createSheet = async (sheetId: string, title: string) => {
                return doBatchUpdate(id, {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    sheetId,
                                    title,
                                }
                            }
                        }
                    ]
                })
            };
            const sheetInfo = async () => {
                const sheetInfos = await getInfo();
                return sheetInfos.sheets.map(s => {
                    const props = s.properties;
                    return {
                        sheetId: props.sheetId,
                        title: props.title,
                        index: props.index, //not important,
                        ...props.gridProperties, //rowCount, columnCount
                    } as ISheetInfoSimple;
                })
            };
            return {
                doBatchUpdate: data => doBatchUpdate(id, data),
                append: (range, data, ops) => append({ id, range }, data, ops),
                read: range => read({ id, range }),
                sheetInfo,
                createSheet,
                updateValues: (range:string, values: string[][], opts?: IGoogleUpdateParms) => {
                    if (!opts) {
                        opts = {
                            valueInputOption: 'USER_ENTERED'
                        }
                    }
                    if (!opts.valueInputOption) opts.valueInputOption = 'USER_ENTERED';
                    return doOp('PUT', id, `/values/${encodeURIComponent(range)}?${getFormData(opts)}`, {
                        values,
                    })
                },
                addSheet: async (title: string) => {
                    const sheetsInfo = await sheetInfo();                
                    //input YYYY, sheetId,
                    const found = sheetsInfo.find(s => s.title === title);
                    if (found) {
                        return {
                            found,
                        }
                    }
                    let newId = 0;
                    for (; ; newId++) {
                        const existing = sheetsInfo.find(s => s.sheetId === newId);
                        if (existing) continue;
                        break;
                    }
                    return createSheet(newId.toString(), title);
                },            
            }
        }
    }
}



//test(true).catch(err => {
    ///console.log(err)
   //console.log(err.response.data);
//})

/*
async function test2() {
    const creds = getClientCredsByEnv('gzperm');    
    await getTokenFromCode(creds, '4/xxxx', 'http://localhost:3000');
}
console.log('invoking test2')
test2().catch(err => {
    console.log('error');
    //console.log(err);
   console.log(err.response.text || err.response.data);
})
*/