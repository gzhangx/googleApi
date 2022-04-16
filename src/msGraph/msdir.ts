import { getDefaultMsGraphConn, ILogger, IMsGraphCreds, IDriveItemInfo } from "./msauth";


export interface IMsDirOps {
    //doGet: (itemId: string, action: string) => Promise<any>;
    //doPost: (itemId: string, action: string, data: object) => Promise<any>;
    //doSearch: (itemId: string, name: string) => Promise<IFileSearchResult>;
    createFile: (path: string, data: Buffer) => Promise<IFileCreateResponse>;
    //getFileById: (itemId: string) => Promise<Buffer>;
    getFileByPath: (itemId: string) => Promise<Buffer>;
    createDir: (path: string, name: string) => Promise<IDirCreateResponse>;
    driveId: string;
}

export interface IMsGraphDirPrms {
    logger: ILogger;
    sharedUrl?: string;
    driveId?: string;
}

export const getDriveUrl = (driveId: string, path: string) => `drives/${driveId}/root:/${encodeURIComponent(path.replace(/['`;\\",()&^$#!%*=+[\]{}|:<>?]/g, ''))}`;
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

    return {
        //doGet,
        //doPost,
        //doSearch: (itemId: string, name: string) => doSearch(itemId, name, doGet),
        createFile,
        //getFileById,
        getFileByPath,
        createDir,
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
    parentReference: {
        driveId: string;
        driveType: string; //"business",
        id: string;
    };
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
    parentReference: {
        driveId: string;
        driveType: string;
        id: string;
        path: string;
    },
    file: {
        mimeType: string; //'text/plain',
        hashes: { quickXorHash: string; };
    };
    fileSystemInfo: {
        createdDateTime: string;
        lastModifiedDateTime: string;
    }
}