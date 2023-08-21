
const gs = require('../lib/googleApiServiceAccount')
const creds = require('../../googleSvcAccount-pem.json')
const util = require('../lib/util');
test().catch(err => {
    console.log(err);
})
async function test() {
    //return console.log(util.xcelPositionToColumnName(0));
    const cli = await gs.getClient(creds);
    const ops = await cli.getSheetOps('1u_AR8y7iCRPGyDhdOb1cHhjL-vclCIxuLkMhIxd08mU')
    //console.log('update val')
    //const rrr = await ops.updateValues('Sheet1!G18:G18', [['3']]);
    //console.log('update done')
    //console.log(rrr)
    //await ops.clear('Sheet1!G18:G18');
    await ops.clear('Sheet1');
    console.log('cleared')
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
