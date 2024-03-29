import { getClientByEnv } from '../googleApi'
import * as gs from '../google/googleApiServiceAccount'
import * as fs from 'fs';

async function test(d:boolean) {
    const cli = gs.getClient(JSON.parse(fs.readFileSync('../googleSvcAccount-pem.json').toString()));
    const ops = cli.getSheetOps('12rmBBbxS6j3-rL0vl25eGV8Hb3O-vNNDMdnNl7rAYeI');
    const vals = await ops.read('Sheet1!A1:B2')
    console.log(vals);
}
async function testOld(d: boolean) {
    const cli = await getClientByEnv('gzperm');
    console.log('got client')    
    const ops = await cli.getSheetOps('1u_AR8y7iCRPGyDhdOb1cHhjL-vclCIxuLkMhIxd08mU')
    console.log('update val')
    const rrr = await ops.updateValues('Sheet1!A1:A1', [['a1']]);
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

test(true).catch(err => {
    if (typeof err !== 'string')
        console.log('err', Object.keys(err));
    //console.log('err', pick(err.response, ['data', 'status', 'statusText', 'headers', 'config.url']));
    console.log('err dsp', err);
});