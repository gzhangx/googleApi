import * as https from 'https';
import * as http from 'http';

export type OutgoingHttpHeaders = http.OutgoingHttpHeaders;
export type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type PromiseRejType = (d: unknown) => void;
export interface IHttpRequestPrms {
    url: string;
    method: HttpRequestMethod;
    headers?: http.OutgoingHttpHeaders;
    data?: string | object | Buffer;
    resProcessor?: (res: http.IncomingMessage, resolve: PromiseRejType, reject: PromiseRejType) => {};
    resDataProcessor?: (res: IHttpResponseType, resolve: PromiseRejType, reject: PromiseRejType) => void;
    followRedirect?: boolean;
}

export interface IHttpResponseType {
    data: string | Buffer | object;
    url: string;
    headers: http.IncomingHttpHeaders;
    complete: boolean;
    requestData: string | object;
    statusCode?: number;
    statusMessage?: string;
}
export async function doHttpRequest(
    requestPrms: IHttpRequestPrms): Promise<IHttpResponseType> {
    
    const rspDataProcessor = requestPrms.resDataProcessor || ((rspData: IHttpResponseType, resolve: PromiseRejType, reject: PromiseRejType) => {
        const contentType = rspData.headers['content-type'];
        if (contentType && contentType.toLowerCase().indexOf('application/json') >= 0) {
            return resolve({
                ...rspData,
                data: rspData.data ? JSON.parse(rspData.data.toString('utf-8')) : rspData.data,
            });
        }
        resolve(rspData);
    });
    let { headers, data,        
    } = requestPrms;
    const { url, method, resProcessor,
        followRedirect,
    } = requestPrms;
    
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        let httpRequest = https.request;
        if (urlObj.protocol === 'http:') {
            httpRequest = http.request;
        }
        let dataToSent: Buffer = null;
        if (data !== null && data !== undefined) {
            if (!headers)
                headers = {};
            if (Buffer.isBuffer(data)) {
                dataToSent = data;
            } else {
                if (typeof data !== 'string') {
                    data = JSON.stringify(data);
                    if (!headers['Content-Type']) {
                        headers['Content-Type'] = 'application/json';
                    }
                }
                dataToSent = Buffer.from(data, 'utf-8');
            }
            headers['Content-Length'] = dataToSent.length;
        }
        const req = httpRequest({
            hostname: urlObj.hostname,
            port: urlObj.port,
            protocol: urlObj.protocol,
            path: urlObj.pathname + urlObj.search,
            method,
            headers,
        }, res => {
            if (resProcessor) {
                resProcessor(res, resolve, reject);
            } else {
                //res.setEncoding('utf8');
                let allBuffData = [];                
                res.on('data', d => {
                    allBuffData.push(d);
                });
                res.on('error', err => {
                    reject(err);
                });
                res.on('end', async () => {
                    const allData = Buffer.concat(allBuffData);
                    const rspData = {
                        headers: res.headers,
                        url,
                        requestData: data,
                        data: allData,
                        complete: res.complete,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                    }

                    if (followRedirect) {
                        if (res.statusCode === 302) {
                            const location = res.headers.location;
                            if (location) {
                                //return await doHttpGet(r.headers.location, opts).then(async r => await parseResp(opts, r)).catch(errProc(new GGraphError(r.headers.location)));
                                try {
                                    const redirRsp = await doHttpRequest({
                                        ...requestPrms,
                                        url: location,
                                        method: 'GET',
                                    });
                                    resolve(redirRsp);
                                } catch (err) {
                                    reject(err);
                                }
                            }
                        }
                    }
                    rspDataProcessor(rspData, resolve, reject); //our def rej is not used

                });
            }
        });
        req.on('error', err => {
            reject(err);
        })
        if (dataToSent) {
            req.write(dataToSent);
        }
        req.end();
    });
}


