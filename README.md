# googleApi
google api helper

for Google Api:
use googleApiServiceAccount.ts.  To create a service account, go to https://console.cloud.google.com/apis/credentials, +Create Credentials, Service account.
Go to keys, add a key,  each sheet needs to share with the client email.
const gs = require('@gzhangx/googleapi');
const ops = await client.getSheetOps('sheetId');
await ops.append('A1:B2', [['1','1'], ['2','2']]);