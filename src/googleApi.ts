
//rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
//opts = { access_type: 'offline', scope: 'https://www.googleapis.com/auth/spreadsheets', response_type: 'code', client_id: 'client_id', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }
//return rootUrl + '?' + querystring.stringify(opts);
//'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&client_id=client_id&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob'

import axios, {Method} from 'axios';

export interface IRefresCreds {
    refresh_token: string;
    client_id: string;
    client_secret: string;
}


export function getFormData(obj: { [id: string]: any }): (string|null) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    const data = keys.map(key => {
        let v = obj[key];
        if (typeof v === 'number') v = '' + v;
        return `${key}=${encodeURIComponent(obj[key])}`;
    }).join('&')
    return data;
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
    getSheeOps: (id: string) => {
        doBatchUpdate: (data: any) => Promise<any>;
        append: (range:string, data: any, opts?: any) => Promise<any>;
        read: (range:string)=>Promise<any>;
    };
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
        getSheeOps: id => {
            return {
                doBatchUpdate: data => doBatchUpdate(id, data),
                append: (range, data, ops) => append({ id, range }, data, ops),
                read: range => read({ id, range }),
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

export async function getClientByEnv(envName: string) {
    const creds: IRefresCreds = {
        client_id: process.env[`google.${envName}.client_id`] as string,
        client_secret: process.env[`google.${envName}.client_secret`] as string,
        refresh_token: process.env[`google.${envName}.refresh_token`] as string,
    };
    return getClient(creds);
}

export async function test(d:boolean) {
    const cli = await getClientByEnv('gzprem');

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



    const sheet = cli.getSheeOps(id);
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

//test().catch(err => {
//   console.log(err.response.text);
//})

