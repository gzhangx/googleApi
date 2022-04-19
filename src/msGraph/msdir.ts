import { getDefaultMsGraphConn, ILogger, IMsGraphCreds, IDriveItemInfo } from "./msauth";
import { sleep } from '../util'
import axios from 'axios'
import * as path from 'path'
import { delay, toPath } from "lodash";
interface IParentReference  {
    driveId: string;
    driveType?: string;
    id: string;
    path: string;
}

export interface IMsDirOps {
    //doGet: (itemId: string, action: string) => Promise<any>;
    //doPost: (itemId: string, action: string, data: object) => Promise<any>;
    //doSearch: (itemId: string, name: string) => Promise<IFileSearchResult>;
    createFile: (path: string, data: Buffer) => Promise<IFileCreateResponse>;
    //getFileById: (itemId: string) => Promise<Buffer>;
    getFileByPath: (itemId: string) => Promise<Buffer>;
    createDir: (path: string, name: string) => Promise<IDirCreateResponse>;
    getFileInfoByPath:(fname: string)=> Promise<IFileCreateResponse>;
    deleteItem: (itemId: string) => Promise<void>;
    copyItem: (parentInfo: IParentReference, itemId: string, toName:string) => Promise<ICopyItemResp>;
    moveItem: (itemId: string, update: IMoveItemResp) => Promise<IMoveItemResp>;
    copyItemByName: (fname: string, toName: string, delayMs?: number)=>Promise<string>;
    getDriveAndByIdUrl: (driveId: string, itemId: string) => string;
    driveId: string;
}

export interface IMsGraphDirPrms {
    logger: ILogger;
    sharedUrl?: string;
    driveId?: string;
}

export interface IMoveItemResp {
    parentReference?:IParentReference;
    name: string;
}

interface ICopyItemResp {
    checkUrl: string;
}

export interface ICopyStatusRes {
    '@odata.context': string;
    percentageComplete: number;
    resourceId: string;
    status: 'inProgress' | 'completed'
}

export const getDriveUrl = (driveId: string, path: string) => `drives/${driveId}/root:/${encodeURIComponent(path.replace(/[\\"|*<>?]/g, ''))}`;
export const getDriveAndByIdUrl = (driveId: string, itemId: string) => `drives/${driveId}/items/${itemId}`;
export async function getMsDir(creds: IMsGraphCreds, prms: IMsGraphDirPrms): Promise<IMsDirOps> {
    const ops = await getDefaultMsGraphConn(creds, prms.logger);
    
    // const getPostFix = (itemId: string, action: string) => `/drive/items('${itemId}')/${action}`    
    // async function doGet(itemId: string, action: string) : Promise<any> {
    //     return ops.doGet(getPostFix(itemId, action), x=>x);
    // }

    // async function doPost(itemId: string, action: string, data: object) {
    //     return ops.doPost(getPostFix(itemId, action), data);
    // }    

    // async function getFileById(itemId: string): Promise<Buffer> {
    //     return ops.doGet(getPostFix(itemId, 'content'), cfg => {
    //         return {
    //             ...cfg,
    //             responseType: 'arraybuffer',
    //         }
    //     });
    // }

    let driveId = prms.driveId;
    if (!driveId) {
        const itmInf = await ops.getSharedItemInfo(prms.sharedUrl);
        if (!itmInf.parentReference) {
            const message = `bad sharedUrl ${prms.sharedUrl}`;
            prms.logger(message);
            throw {
                message
            };
        }
        driveId = itmInf.parentReference.driveId;
    }
    //const getDriveUrl = () => `https://graph.microsoft.com/v1.0/users('${opt.userId}')/drive`
    //const getUrl = (itemId: string, action: string) => `${getDriveUrl()}/items('${itemId}')/${action}`;
       
    async function createFile(path: string, data: Buffer): Promise<IFileCreateResponse> {
        return ops.doPut(`${getDriveUrl(driveId, path)}:/content`, data);
    }
    
    async function getFileByPath(fname: string): Promise<Buffer> {
        return ops.doGet(`${getDriveUrl(driveId, fname)}:/content`, cfg => {
            return {
                ...cfg,
                responseType: 'arraybuffer',
            }
        });
    }

    async function createDir(path: string, name: string): Promise<IDirCreateResponse> {
        return ops.doPost(`${getDriveUrl(driveId, path)}:/children`, {
            name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "replace"
        });
    }

    async function getFileInfoByPath(fname: string) : Promise<IFileCreateResponse> {
        return ops.doGet(`${getDriveUrl(driveId, fname)}`);
    }
    async function deleteItem(itemId: string) :Promise<void> {
        return ops.doDelete(`${getDriveAndByIdUrl(driveId, itemId)}`);
    }
    async function copyItem(parentInfo: IParentReference, itemId: string, toName: string): Promise<ICopyItemResp> {
        const postData = {
            parentReference: {
                driveId,
                id: parentInfo.id,
                path: parentInfo.path,
            },
            name: toName,
        };
        const headers = await ops.getHeaders();
        return axios.post(ops.getMsGraphBaseUrl(`${getDriveAndByIdUrl(driveId, itemId)}/copy?@microsoft.graph.conflictBehavior=rename`), postData, headers).then(res => {
            //console.log(res);
            return {
                checkUrl: res.headers.location,
            }
        })        
    }

    async function copyItemByName(fname: string, toName: string, delayMs?: number) {
        if (!delayMs || delayMs < 0) delayMs = 100;
        const info = await getFileInfoByPath(fname);
        const toPath = path.dirname(toName);
        const toNameFile = path.basename(toName);
        console.log(`to path ${toPath}, to file=${toNameFile}`);
        const cpyRes = await copyItem({
            driveId: info.parentReference.driveId,
            path: toPath,
            id: '',
        }, info.id, toNameFile);

        while (true) {            
            const waitRes = (await axios.get(cpyRes.checkUrl)).data as ICopyStatusRes;
            if (waitRes.status === 'completed') {
                return waitRes.resourceId;
            }
            await sleep(delayMs)
        }
    }

    async function moveItem(itemId: string, update:IMoveItemResp) :Promise<IMoveItemResp> {
        return ops.doPatch(`${getDriveAndByIdUrl(driveId, itemId)}`, update);
    }

    return {
        //doGet,
        //doPost,
        //doSearch: (itemId: string, name: string) => doSearch(itemId, name, doGet),
        createFile,
        //getFileById,
        getFileByPath,
        createDir,
        getFileInfoByPath,
        deleteItem,
        copyItem,
        moveItem,
        getDriveAndByIdUrl,
        copyItemByName,
        driveId,
    }

}

export interface IDirCreateResponse {
    "@odata.type": "#microsoft.graph.driveItem";
    createdDateTime: string;
    id: string;
    lastModifiedDateTime: string;
    name: string;
    webUrl: string; //https://acccnusa-my.sharepoint.com/personal/gangzhang_acccn_org/Documents/NewUserImages,
    size: number;
    createdBy: {
        user: {
            email: string;
            displayName: string;
        };
    };
    lastModifiedBy: {
        user: {
            email: string;
            displayName: string;
        };
    };
    parentReference: IParentReference;
    fileSystemInfo: {
        createdDateTime: string;
        lastModifiedDateTime: string;
    };
    folder?: {
        childCount: number;
    };
    searchResult: object;
}

export interface IFileSearchResult {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#Collection(driveItem)";
    value: IDirCreateResponse[];
}
async function doSearch(itemId: string, name: string, doGet: (itemId: string, action: string) => Promise<any>)
    : Promise<IFileSearchResult>{
    const res = await doGet(itemId, `search(q='${name}')`);
    return res as IFileSearchResult;
}



interface IFileCreateResponse {
    '@odata.context': string;
    '@microsoft.graph.downloadUrl': string;
    createdDateTime: string;
    eTag: string;
    id: string;
    lastModifiedDateTime: string;
    name: string;
    webUrl: string;
    cTag: string;
    size: number,
    createdBy: {
        application: {
            id: string;
            displayName: string;
        };
        user: {
            email: string;
            id: string;
            displayName: string;
        };
    };
    lastModifiedBy: {
        application: {
            id: string;
            displayName: string;
        };
        user: {
            email: string;
            id: string;
            displayName: string;
        };
    };
    parentReference: IParentReference,
    file: {
        mimeType: string; //'text/plain',
        hashes: { quickXorHash: string; };
    };
    fileSystemInfo: {
        createdDateTime: string;
        lastModifiedDateTime: string;
    }
}