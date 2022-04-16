
//rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
//opts = { access_type: 'offline', scope: 'https://www.googleapis.com/auth/spreadsheets', response_type: 'code', client_id: 'client_id', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }
//return rootUrl + '?' + querystring.stringify(opts);
//'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&client_id=client_id&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob'

import axios, { Method } from 'axios';
import {getFormData} from './util'

export interface IGClientCreds {
    client_id: string;
    client_secret: string;
}

export interface IRefresCreds extends IGClientCreds {
    refresh_token: string;    
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
    access_token: string;
    expires_on: number;
    token_type: string;
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

export async function getTokenFromCode(creds: IGClientCreds, code:string, redirect_uri:string) : Promise<IGoogleToken> {
    const { client_id, client_secret } = creds;
    const dataStr = getFormData({
        client_secret,
        client_id,
        code,
        redirect_uri,
        grant_type: 'authorization_code'
    });

    const tokenBody = await axios.post('https://oauth2.googleapis.com/token', dataStr,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(r => {            
            return r.data;
        });
    return tokenBody;
}
async function doRefresh(creds: IRefresCreds): Promise<IGoogleClient> {
    const { refresh_token, client_id, client_secret } = creds;
        
    const dataStr = getFormData({
        client_secret,
        client_id,
        refresh_token,
        grant_type: 'refresh_token'
    });
    const refreshBody = await axios.post('https://oauth2.googleapis.com/token', dataStr,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(r => {
            return r.data;
        });

    const {
        access_token, expires_in, token_type
    } = refreshBody;
    const doOp = (op: string, id: string, postFix: string, data?: any) =>
        axios({
            url: `https://sheets.googleapis.com/v4/spreadsheets/${id}${postFix}`,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`,
            },
            method:op as Method,
            data,
        }).then(r => {
            return (r.data)
        });        
    const doPost = (id:string, postFix:string, data:any) => doOp('post', id, postFix, data);
    const doBatchUpdate = async (id:string, data:any) => doPost(id, ':batchUpdate', data);
    const append: IAppendFunc = async ({ id, range }, data, opts) => {
        if (!opts) {
            opts = {}
        }
        if (!opts.valueInputOption) opts.valueInputOption = 'USER_ENTERED';
        return await doPost(id, `/values/${range}:append?${getFormData(opts)}`, { values: data });
    };
    const read: IReadFunc = async ({ id, range }) => doOp('get', id, `/values/${range}`);
    return {
        access_token,
        expires_on: new Date().getTime() + (expires_in * 1000 - 2000),
        token_type,
        doBatchUpdate,
        append,
        read,
        getSheetOps: id => {
            const getInfo = () => doOp('get', id, '') as Promise<IGoogleSheetInfo>;
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
                    return doOp('put', id, `/values/${encodeURIComponent(range)}?${getFormData(opts)}`, {
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

const clients = {} as {
    [name: string]: IGoogleClient;
};
export async function getClient(creds: IRefresCreds) {
    const name = creds.client_id;
    let client = clients[name];
    const now = new Date().getTime();
    if (!client || client.expires_on <= now) {
        client = await doRefresh(creds);
        if (!client) return null;
        clients[name] = client;
    }
    return client;
}

export function getClientCredsByEnv(envName: string) {
    const creds: IGClientCreds = {
        client_id: process.env[`google_${envName}_client_id`] as string,
        client_secret: process.env[`google_${envName}_client_secret`] as string,
    };    
    return creds;
}

export async function getClientByEnv(envName: string) {
    const creds: IRefresCreds = {
        ...getClientCredsByEnv(envName),
        refresh_token: process.env[`google_${envName}_refresh_token`] as string,
    };
    return getClient(creds);
}

export async function test(d:boolean) {
    const cli = await getClientByEnv('gzperm');
    const ops = await cli.getSheetOps('1u_AR8y7iCRPGyDhdOb1cHhjL-vclCIxuLkMhIxd08mU')
    console.log('update val')
    const rrr = await ops.updateValues('Sheet1!G18:G18', [['1']]);
    console.log('update done')
console.log(rrr)
if (d) return;
    if (!cli) return console.log('failed to get client');
    const id = '1MO27odjCsxk6MWL0DygubU53hrtt3OB8SEnqjpUHJ-U';
    if (d) return;
    console.log('do batch update');
    await cli.doBatchUpdate(id, {
        "requests": [
            {
                "updateDimensionProperties": {
                    "range": {
                        "sheetId": 0,
                        "dimension": "COLUMNS",
                        "startIndex": 0,
                        "endIndex": 1
                    },
                    "properties": {
                        "pixelSize": 160
                    },
                    "fields": "pixelSize"
                },

            }
        ]
    })
    console.log('do batch update 2');
    const upres = await cli.doBatchUpdate(id, {
        "requests": [
            {

                "updateCells": {
                    "fields": "*",
                    "range": {
                        "sheetId": 0,
                        "startColumnIndex": 0,
                        "endColumnIndex": 10,
                        "startRowIndex": 0,
                        "endRowIndex": 10
                    },
                    "rows": [
                        {
                            "values": [
                                {
                                    "userEnteredFormat": {
                                        "backgroundColor": {
                                            "blue": 10,
                                            "green": 10,
                                            "red": 255
                                        },
                                        "borders": {
                                            "bottom": {
                                                "style": "SOLID",
                                                "width": 8,
                                                "color": {
                                                    "blue": 0,
                                                    "green": 255,
                                                    "red": 0
                                                }
                                            }
                                        }
                                    },
                                    "userEnteredValue": { "stringValue": "strstsdfasdf" }
                                },
                                {
                                    "userEnteredValue": { "stringValue": "col1" }
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    });
    console.log(upres);

    console.log('append 1');
    const appres = await cli.append({
        id,
        range: `'Sheet1'!A1:B2`
    }, [
        ['aaa', 'bbb1']
    ])
    console.log('append res');
    console.log(appres);

    console.log('read');
    const rres = await cli.read({
        id,
        range: 'A1:B4'
    });
    console.log('read res');
    console.log(rres);



    const sheet = cli.getSheetOps(id);
    sheet.doBatchUpdate({
        "requests": [
            {
                "updateDimensionProperties": {
                    "range": {
                        "sheetId": 0,
                        "dimension": "COLUMNS",
                        "startIndex": 0,
                        "endIndex": 1
                    },
                    "properties": {
                        "pixelSize": 100
                    },
                    "fields": "pixelSize"
                },

            }
        ]
    })
    await sheet.append('A:B', [['c', 'D']]);
    console.log(await sheet.read('A1:B4'));
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