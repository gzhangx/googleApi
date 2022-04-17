import { getFormData} from './util'
import { getClient, getClientByEnv, getTokenFromCode, getClientCredsByEnv } from './googleApi'


const google = {
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
export { getFormData, google, msGraph }
