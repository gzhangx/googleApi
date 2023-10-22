import * as util from './util'
//don't use any more, use gsAccount instead
import { getClient, getClientByEnv, getTokenFromCode, getClientCredsByEnv } from './googleApi'
import * as gsAccount from './google/googleApiServiceAccount'

import * as googleDrive from './google/drive';
//google should not be used
const googleOld = {
    getClient, getClientByEnv,getTokenFromCode,getClientCredsByEnv
}

import * as msauth from './msGraph/msauth'
import * as msdir from './msGraph/msdir'
import * as msExcell from './msGraph/msExcell'

const msGraph = {
    msauth,
    msdir,
    msExcell
}

const google = {
    drive: googleDrive,
    gsAccount,
}
export {
    googleOld, //don't use
    msGraph,
    gsAccount,
    //httpRequest, moved to util
    util,
    google,
}
