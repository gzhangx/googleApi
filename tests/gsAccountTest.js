
const gs = require('../lib/google/googleApiServiceAccount')
const creds = require('../../../gskey.json')
const util = require('../lib/util');
const drive = require('../lib/google/drive')
const {get, set, pick} = require('../lib/util');
console.log(get({ a: { b: '1' } }, ['a', 'b', 'c']));
console.log(get({ a: { b: '1' } }, 'a'));

const oo = {} ;
set(oo, 'a.b.c', 2);
console.log(oo);

console.log(pick({
    a: '1',  c: { d: '3',e:'aa' }
}, ['a','b','c.d']), 'pick')
test().catch(err => {
    console.log(err);
})

async function testNewOps() {
    const token = 'ya29.-';
    const cli = await gs.getClient(creds);
    const ops = await cli.getSheetOps('12rmBBbxS6j3-rL0vl25eGV8Hb3O-vNNDMdnNl7rAYeI');
    //await ops.clear('Sheet1', { col: 1, row: 1 });
    const rd = await ops.readData('Sheet1');
    console.log('cleared', rd)
    /*
    const createNewRes = await cli.createTopNewSheet({
        //spreadsheetId: 'testid',
        sheets: [],
        properties: {
            title: 'testspreadsheet',
            locale: 'en_US',
            defaultFormat: null,
        }
    });
    console.log(createNewRes, 'createnew res')
    
    const driveOps = drive.getGoogleDriveOps(token);
    const drivePermRes = await driveOps.addPermission({
        fileId: createNewRes.spreadsheetId,
        emailMessage: 'testtest from api',
        sendNotificationEmail: true,
        data: {
            emailAddress: 'gzhangx@hotmail.com',
            role: 'writer',
            type:'user'
        }
    })
    
    console.log(drivePermRes, 'drivePreRes');
    */
    //const sheetInfo = await ops.sheetInfo();
    //console.log(sheetInfo, 'sheet info');
    //const updateRes = await ops.autoUpdateValues('Sheet1', [
    //    ['col1', 'col2'],
    //    ['3', '4'],
    //])
    //console.log(updateRes, 'updateRes')

    //const reads = await ops.readDataByColumnName('Sheet1');
    //console.log(reads, 'reads');
}
async function test() {
    return testNewOps();
    //return console.log(util.xcelPositionToColumnName(0));
    const cli = await gs.getClient(creds);
    const createNewRes = await cli.createTopNewSheet({
        //spreadsheetId: 'testid',
        sheets: [],
        properties: {
            title: 'testspreadsheet',
            locale: 'en_US',
            defaultFormat: null,
        }
    });
    console.log(createNewRes);
    const ops = await cli.getSheetOps('1u_AR8y7iCRPGyDhdOb1cHhjL-vclCIxuLkMhIxd08mU')
    //console.log('update val')
    //const rrr = await ops.updateValues('Sheet1!G18:G18', [['3']]);
    //console.log('update done')
    //console.log(rrr)
    //await ops.clear('Sheet1!G18:G18');
    await ops.clear('Sheet1', {col: 1, row:1});
    console.log('cleared')
    if (cli) return;
    await ops.autoUpdateValues('Sheet1', [
        ['col1', 'col2'],
        ['3', '4'],
    ], {
        row: 2,
        col: 2,
    })

    const reads = await ops.readDataByColumnName('Sheet1', {row: 2, col:2});
    console.log(reads);

    const readsRaw = await ops.readData('Sheet1', { row: 3, col: 40 });
    console.log(readsRaw, 'readsRaw');


    const addSheetRsp = await ops.addSheet('test1');
    if (addSheetRsp.replies) {
        console.log(addSheetRsp.replies[0]);
    } else {
        await ops.deleteSheetByName('test1');
    }
    /*
    {
  addSheet: {
    properties: {
      sheetId: 3,
      title: 'test1',
      index: 5,
      sheetType: 'GRID',
      gridProperties: [Object]
    }
  }
}
    */
    return;
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
