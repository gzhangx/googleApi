
//rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
//opts = { access_type: 'offline', scope: 'https://www.googleapis.com/auth/spreadsheets', response_type: 'code', client_id: 'client_id', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }
//return rootUrl + '?' + querystring.stringify(opts);
//'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&client_id=client_id&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob'

import { doHttpRequest, HttpRequestMethod } from './httpRequest';
import { getFormData, xcelPositionToColumnName } from './util'
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
interface IReadReturn {
    values: string[][];
}
type IDoOpReturn = Promise<string | object | Buffer>;
type IAppendFunc = (idRng: IIdRange, data: any, opts?: any) => IDoOpReturn;
type IReadFunc = (idRng: IIdRange) => Promise<IReadReturn>;
type RowColOffset = { row: number; col: number };
type IDoOpWithErrorReturn = {
    error?: {
        code: number;
        message: string;
        status: string;    
    }
}

export type IGetSheetOpsReturn = {
    doBatchUpdate: (data: any) => IDoOpReturn;
    appendRowCols: (sheetId: number, ap: RowColOffset) => IDoOpReturn;
    append: (range: string, data: any, opts?: any) => IDoOpReturn;
    read: (range: string) => IDoOpReturn;
    clear: (range: string) => IDoOpReturn;
    readDataByColumnName: (sheetName: string, readSize?: RowColOffset, offset?: RowColOffset) => Promise<{ data?: ({ [name: string]: string }[]), message: string }>;
    readData: (sheetName: string, readSize?: RowColOffset, offset?: RowColOffset) => Promise<{ data ?: (string[][]), message: string }>;
    sheetInfo: () => Promise<ISheetInfoSimple[]>;
    createSheet: (sheetId: string, title: string) => IDoOpReturn;
    deleteSheet: (sheetId: number) => IDoOpReturn;
    deleteSheetByName: (sheetTitle: string) => IDoOpReturn;
    autoCreateSheet: (title: string) => IDoOpReturn;  //create sheet and use current sheetId to create a new sheet
    updateValues: (range: string, values: string[][], opts?: IGoogleUpdateParms) => Promise<IDoOpWithErrorReturn>;
    autoUpdateValues: (sheetName: string, values: string[][], offset?: RowColOffset, opts?: IGoogleUpdateParms) => Promise<IDoOpWithErrorReturn>;
    addSheet: (title: string) => IDoOpReturn;
};
export interface IGoogleClient {
    getToken: () => string;
    doBatchUpdate: (id: string, data: any) => IDoOpReturn;
    append: IAppendFunc;
    read: IReadFunc;
    getSheetOps: (id: string) => IGetSheetOpsReturn;
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
            return (r.data)
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
    const read: IReadFunc = async ({ id, range }) => (await doOp('GET', id, `/values/${range}`)) as IReadReturn;    
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
            const clear = async (range:string) => {                
                return await doOp('POST', id, `/values/${range}:clear`) as IReadReturn;
            }
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
            const deleteSheet = async (sheetId: number) => {
                return doBatchUpdate(id, {
                    requests: [
                        {
                            deleteSheet: {
                                sheetId,
                            }
                        }
                    ]
                })
            };

            const deleteSheetByName = async (title: string) => {
                const sheets = await sheetInfo();
                const sheet = sheets.find(s => s.title === title);
                if (sheet) {
                    return await deleteSheet(sheet.sheetId);
                }
                return {
                    message: 'not found',
                }
            }
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
            
            ///  create sheet and deduct sheet Id from existing
            const autoCreateSheet = async (title: string) => {
                const sheets = await sheetInfo();
                const sheet = sheets.find(s => s.title === title);
                if (sheet) return {
                    message: 'found'
                };
                const maxId = sheets.reduce((acc, s) => {
                    if (s.sheetId > acc) {
                        acc = s.sheetId;
                    }
                    return acc;
                }, 0) + 1;

                return await createSheet(maxId.toString(), title);
            };

            async function getSheetRange(sheetName: string, readSize: RowColOffset = {row:0, col:0}, offset: RowColOffset = {row:0, col:0}) {
                if (sheetName.indexOf('!') < 0) {
                    sheetName = sheetName.trim();
                    const sheetInfos = await sheetInfo();
                    const info = sheetInfos.find(s => s.title === sheetName);
                    if (!info) {
                        throw {
                            message: `Error get sheet info for ${id}`,
                        }
                    }
                    if (!readSize.col) readSize.col = info.columnCount;
                    const endCol = readSize.col + offset.col;          

                    const appendOps: RowColOffset = {
                        row: 0,
                        col: 0,
                    }
                    if (endCol > info.columnCount) {
                        appendOps.col = endCol - info.columnCount;
                    }

                    if (!readSize.row) readSize.row = info.rowCount;
                    const endRow = readSize.row + offset.row;
                    if (endRow > info.rowCount) {
                        appendOps.row = endRow - info.rowCount;
                    }
                    if (appendOps.col || appendOps.row) {
                        await appendRowCols(info.sheetId, appendOps);
                    }
                    return `'${sheetName}'!${xcelPositionToColumnName(offset.col) }${1 + offset.row}:${xcelPositionToColumnName(endCol)}${endRow}`;
                }
                return sheetName;
            }

            async function appendRowCols(sheetId: number, ap: RowColOffset) {
                const requests = [];
                if (ap.col) {                                  
                    requests.push({
                        appendDimension: {
                            sheetId,
                            dimension: 'COLUMNS',
                            length: ap.col,
                        }
                    })
                }
                if (ap.row) {
                    requests.push({
                        appendDimension: {
                            sheetId,
                            dimension: 'ROWS',
                            length: ap.row,
                        }
                    },)
                }
                return doBatchUpdate(id, { requests });
            }
            async function readDataByColumnName(sheetName: string, readSize: RowColOffset = { row: 0, col: 0 }, offset: RowColOffset = {row: 0, col:0}) {
                sheetName = await getSheetRange(sheetName, readSize, offset);
                const ret = await read({ id, range: sheetName });
                if (!ret.values) {
                    throw {
                        message: `bad data found for id ${id} sheet ${sheetName}`,
                    }
                }
                const columns = ret.values[0];
                const dataRow = ret.values.slice(1);
                const data = dataRow.map(d => {
                    return columns.reduce((acc, column, i) => {
                        acc[column] = d[i];
                        return acc;
                    }, {} as { [name:string]:string});
                });
                return {
                    message: 'OK',
                    data,
                }
            }

            async function readData(sheetName: string, readSize: RowColOffset, offset: RowColOffset = { row: 0, col: 0 }) {
                sheetName = await getSheetRange(sheetName, readSize, offset);
                const ret = await read({ id, range: sheetName });
                
                const message = ret.values ? 'OK' : `bad data found for id ${id} sheet ${sheetName}`;                
                return {
                    message,
                    data: ret.values,
                }
            }

            const updateValues = async (range: string, values: string[][], opts?: IGoogleUpdateParms) => {
                if (!opts) {
                    opts = {
                        valueInputOption: 'USER_ENTERED'
                    }
                }
                if (!opts.valueInputOption) opts.valueInputOption = 'USER_ENTERED';
                return await doOp('PUT', id, `/values/${encodeURIComponent(range)}?${getFormData(opts)}`, {
                    values,
                }) as Promise<IDoOpWithErrorReturn>;
            };

            async function autoUpdateValues(sheetName: string, values: string[][], offset?: RowColOffset, opts?: IGoogleUpdateParms): Promise<IDoOpWithErrorReturn> {
                if (!values || !values.length) return null;
                const writeSize: RowColOffset = {
                    col: values[0].length,
                    row: values.length,
                };
                const range = await getSheetRange(sheetName, writeSize, offset);
                return await updateValues(range, values, opts) as Promise<IDoOpWithErrorReturn>;
            }

            return {
                doBatchUpdate: data => doBatchUpdate(id, data),
                appendRowCols,
                append: (range, data, ops) => append({ id, range }, data, ops),
                read: range => read({ id, range }),
                clear,
                sheetInfo,
                createSheet,
                autoCreateSheet,
                updateValues,
                autoUpdateValues,
                readDataByColumnName,
                readData,
                deleteSheet,
                deleteSheetByName,
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