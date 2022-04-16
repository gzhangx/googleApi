import * as fs from 'fs'
import * as all from '../src/index'
import { IMsGraphCreds } from '../src/msGraph/msauth';
import { IMsGraphDirPrms } from '../src/msGraph/msdir';
import { IMsGraphExcelItemOpt } from '../src/msGraph/msExcell';

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
    if (!refresh_token) {
        all.msGraph.getAuth({
            ...tenantClientInfo,
            promptUser: (msg, info) => console.log(msg, info),
            saveToken: async tk => {
                console.log('got ti', tk);
                fs.writeFileSync('../testref.txt', JSON.stringify(tk));
            }
        })
    }
    const prm: IMsGraphDirPrms = {        
        logger: msg => console.log(msg),
        sharedUrl: '',
        driveId:'',
    };
    const opt: IMsGraphExcelItemOpt = {
        itemId:'EZh2ofMzlZhEiiBvvg_s3tUBtjZaSbuzkXo9Vg1BtXJuIg'
    };    
    const sheet = await all.msGraph.getMsExcel(tenantClientInfo, prm, opt);
    console.log('done')
}

test();