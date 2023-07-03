import * as util from './util'
//don't use any more, use gsAccount instead
import { getClient, getClientByEnv, getTokenFromCode, getClientCredsByEnv } from './googleApi'
import * as gsAccount from './googleApiServiceAccount'

//google should not be used
const google = {
    getClient, getClientByEnv,getTokenFromCode,getClientCredsByEnv
}

import * as msauth from './msGraph/msauth'
import * as msdir from './msGraph/msdir'
import * as msExcell from './msGraph/msExcell'
import * as httpRequest from './httpRequest'

const msGraph = {
    msauth,
    msdir,
    msExcell
}

export {
    google, //don't use
    msGraph,
    gsAccount,
    //httpRequest, moved to util
    util,
}
