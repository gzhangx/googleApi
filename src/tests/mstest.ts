import * as fs from 'fs'
import * as all from '../index'

import { IMsGraphCreds } from '../msGraph/msauth';
import { IMsGraphDirPrms } from '../msGraph/msdir';
import { IMsGraphExcelItemOpt } from '../msGraph/msExcell';

async function test() {
    let refresh_token = '';
    try {
        const refTk = JSON.parse(fs.readFileSync('../testref.txt').toString()) as { refresh_token: string }
        refresh_token = refTk.refresh_token;
    } catch (err) {

    }        
    const tenantClientInfo: IMsGraphCreds = {
        client_id: '72f543e0-817c-4939-8925-898b1048762c',
        refresh_token,
        tenantId:'60387d22-1b13-42a0-8894-208eeafd9e57', //https://portal.azure.com/#home, https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
    }
    console.log('with creds', tenantClientInfo)
    if (!refresh_token) {
        const ar = all.msGraph.getAuth({
            ...tenantClientInfo,
            promptUser: (msg, info) => console.log(msg, info),
            saveToken: async tk => {
                console.log('got ti', tk);
                fs.writeFileSync('../testref.txt', JSON.stringify(tk));
            }
        });

        console.log('getting getRefreshToken')
        try {
            const ast = await ar.getRefreshToken();
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
        logger: msg => console.log(msg),
        sharedUrl: 'https://acccnusa-my.sharepoint.com/:x:/r/personal/gangzhang_acccn_org/Documents/%E4%B8%89%E7%A6%8F%E6%8E%A2%E8%AE%BF%E8%AE%B0%E5%BD%95.xlsx?d=wf3a17698953344988a206fbe0fecded5&csf=1&web=1&e=sMhg4O',
        driveId:'',
    };
    const opt: IMsGraphExcelItemOpt = {
        //itemId: '01XX2KYFMYO2Q7GM4VTBCIUIDPXYH6ZXWV',
        fileName:'三福探访记录.xlsx'
    };    
    console.log('getting sheet')
    const sheet = await all.msGraph.getMsExcel(tenantClientInfo, prm, opt);
    const info = await sheet.getWorkSheets()
    console.log(info);
    const data = await sheet.readRange('Sheet1', 'A1', 'G1');
    console.log('got sheet done', data)

    const dataAll = await sheet.readAll('Sheet1');
    console.log('got sheet done', dataAll.text)

    const summary =dataAll.text.slice(1).reduce((acc, d) => {
        const leader = d[4];
        const std = d[5].split(/[,，]+/);
        console.log(d[5],std)
        const doAdd = (name: string) => {
            acc[name] = (acc[name] || 0) + 1;
        }
        doAdd(leader);
        std.forEach(doAdd);
        return acc;
    }, {
    } as { [name: string]: number });
    console.log(summary)
}

test().catch(err => {
    console.log(err)
})
