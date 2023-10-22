import * as util from '../util'

const rootUrl = 'https://www.googleapis.com/drive/v3';

export interface AddPermissionData {
    role: 'writer' | 'reader';
    type: 'user';
    emailAddress: string;
}

export interface AddPermissionRequest {
    emailMessage?: string;
    sendNotificationEmail?: boolean;
    fileId: string;
    data: AddPermissionData;
}
function addPermission(token: string, req: AddPermissionRequest) {
    return util.doHttpRequest({
        method: 'POST',
        url: `${rootUrl}/files/${req.fileId}/permissions?emailMessage=${req.emailMessage}&sendNotificationEmail=${req.sendNotificationEmail || false}`,
        data: req.data,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        }
    })
}

export function getGoogleDriveOps(token: string) {
    return {
        addPermission: (req: AddPermissionRequest) => addPermission(token, req),
    }
}