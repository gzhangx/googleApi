import * as fs from 'fs'
import * as all from '../index'

import { IMsGraphCreds } from '../msGraph/msauth';
import { IMsGraphDirPrms } from '../msGraph/msdir';
import { IMsGraphExcelItemOpt } from '../msGraph/msExcell';
import {get} from '../util'

function getTenantInfo() {
    let refresh_token = '';
    try {
        const refTk = JSON.parse(fs.readFileSync('../testref.txt').toString()) as { refresh_token: string }
        refresh_token = refTk.refresh_token;
    } catch (err) {

    }        
    const tenantClientInfo: IMsGraphCreds = {
        client_id: '72f543e0-817c-4939-8925-898b1048762c',
        refresh_token,
        tenantId: '60387d22-1b13-42a0-8894-208eeafd9e57', //https://portal.azure.com/#home, https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
        logger: (...msg) => console.log(...msg),
    }
    console.log('with creds', tenantClientInfo)
    return tenantClientInfo;
}
async function test() {
    const tenantClientInfo: IMsGraphCreds = getTenantInfo();
    if (!tenantClientInfo.refresh_token) {
        const ar = all.msGraph.msauth.getAuth(tenantClientInfo);

        console.log('getting getRefreshToken')
        try {
            const ast = await ar.getRefreshToken(
                async tk => {
                    console.log('got ti', tk);
                    fs.writeFileSync('../testref.txt', JSON.stringify(tk));
                },
                (msg, inf)=>console.log(msg,inf),
            );
            console.log(`got getRefreshToken token`, ast);
            tenantClientInfo.refresh_token = ast.refresh_token;
        } catch (err) {
            console.log(`error get getRefreshToken token`)
            if (err.response.data) {
                console.log(err.response.data);
            } else {
                console.log(err)
            }
            return;
        }
    }
    const prm: IMsGraphDirPrms = {  
        creds: tenantClientInfo,
        sharedUrl: 'https://acccnusa.sharepoint.com/:x:/r/sites/LocalMission/_layouts/15/Doc.aspx?sourcedoc=%7B8D63AFAA-9357-4D71-9C38-CC8DBBB15B19%7D&file=%E4%B8%89%E7%A6%8F%E6%8E%A2%E8%AE%BF%E8%AE%B0%E5%BD%95%20NewLocalMission.xlsx&action=default&mobileredirect=true',        
    };
    const opt: IMsGraphExcelItemOpt = {
        //itemId: '01XX2KYFMYO2Q7GM4VTBCIUIDPXYH6ZXWV',
        fileName: '三福探访记录.xlsx'
    };    
    console.log('getting sheet')
    const sheet = await all.msGraph.msExcell.getMsExcel(prm, opt);
    const info = await sheet.getWorkSheets()
    console.log('Info=====>',info);
    const data = await sheet.readRange('2023', 'A1', 'G1');
    console.log('got sheet done', data)

    const dataAll = await sheet.readAll('2023');
    console.log('got sheet done', dataAll.text)

    const summary =dataAll.text.slice(1).reduce((acc, d) => {
        const leader = d[4];
        const std = d[5].split(/[,，]+/);
        console.log(d[5],std)
        const doAdd = (name: string) => {
            name = name.trim();
            if (!name) return;
            acc[name] = (acc[name] || 0) + 1;
        }
        doAdd(leader);
        std.forEach(doAdd);
        return acc;
    }, {
    } as { [name: string]: number });
    console.log(summary)
    const updateData = Object.keys(summary).sort().map(name => {
        return [name, summary[name].toString()];
    })
    console.log(updateData);
    const creatRes = await sheet.createSheet('Summary');
    console.log(`create res`, creatRes);
    await sheet.updateRange('Summary', 'A1', `B${updateData.length}`, updateData);
    
    const msdirOps = await all.msGraph.msdir.getMsDir(prm);
    const cpinfo = await msdirOps.getFileInfoByPath('empty2022expense.xlsx')
    console.log(cpinfo.id);
console.log(cpinfo.parentReference)
    const cpres = await msdirOps.copyItem({
        ...cpinfo.parentReference,
        id: '',
        path: cpinfo.parentReference.path+'/temptest'
    }, cpinfo.id, 'testnewDelete.xlsx');
    console.log(cpres);
    
}


async function testFast() {
    const tenantClientInfo: IMsGraphCreds = getTenantInfo();
    const prm: IMsGraphDirPrms = {      
        creds: tenantClientInfo,        
        sharedUrl: 'https://acccnusa-my.sharepoint.com/:x:/r/personal/gangzhang_acccn_org/Documents/%E4%B8%89%E7%A6%8F%E6%8E%A2%E8%AE%BF%E8%AE%B0%E5%BD%95.xlsx?d=wf3a17698953344988a206fbe0fecded5&csf=1&web=1&e=sMhg4O',
    };
    const msdirOps = await all.msGraph.msdir.getMsDir(prm);
    /*
    const cpinfo = await msdirOps.getFileInfoByPath('Documents/safehouse/empty2022expense.xlsx')
    console.log(cpinfo.id);
    const cpres = await msdirOps.copyItem({
        driveId: cpinfo.parentReference.driveId,
        path: 'Documents/safehouse/safehouseRecords',
        id:'',
    }, cpinfo.id, 'testnewDelete.xlsx');
    console.log(cpres);
    */
    
    const newId = await msdirOps.copyItemByName('Documents/safehouse/empty2022expense.xlsx', 'Documents/safehouse/safehouseRecords/delet1.xlsx')
    console.log('newFileId is ', newId);

    //prm.driveId = msdirOps.driveId;
    const xlsOps = await all.msGraph.msExcell.getMsExcel(prm, {
        itemId: newId,        
    })
    const sheetRes = await xlsOps.readAll('Table B')
    console.log(sheetRes.values);
    sheetRes.values[50][0] = 'testtestesfaasdfadfaf';
    await xlsOps.updateRange('Table B', 'A1', `J${sheetRes.values.length}`, sheetRes.values);
}

async function testGetFile() {
    const tenantClientInfo: IMsGraphCreds = getTenantInfo();
    const prm: IMsGraphDirPrms = {
        creds: tenantClientInfo,
        sharedUrl: 'https://acccnusa-my.sharepoint.com/:x:/r/personal/gangzhang_acccn_org/Documents/%E4%B8%89%E7%A6%8F%E6%8E%A2%E8%AE%BF%E8%AE%B0%E5%BD%95.xlsx?d=wf3a17698953344988a206fbe0fecded5&csf=1&web=1&e=sMhg4O',
    };
    const msdirOps = await all.msGraph.msdir.getMsDir(prm);
    /*
    const cpinfo = await msdirOps.getFileInfoByPath('Documents/safehouse/empty2022expense.xlsx')
    console.log(cpinfo.id);
    const cpres = await msdirOps.copyItem({
        driveId: cpinfo.parentReference.driveId,
        path: 'Documents/safehouse/safehouseRecords',
        id:'',
    }, cpinfo.id, 'testnewDelete.xlsx');
    console.log(cpres);
    */

    const data = await msdirOps.getFileByPath('Documents/safehouse/empty2022expense.xlsx');
    console.log('data', data.byteLength, data.length);
    fs.writeFileSync('d:/temp/tmp.xlsx', data, {
        encoding: 'binary'
    });
    
}

test().catch(err => {
    console.log('error happened');
    console.log(get(err, 'response.data') || err)
    console.log('error happened end');
})
