// Check if we're in a browser environment
const isBrowser = typeof globalThis !== 'undefined' && 
                  typeof (globalThis as any).window !== 'undefined' && 
                  typeof (globalThis as any).document !== 'undefined';

// Node.js imports (only used in Node.js environment)

export type OutgoingHttpHeaders = Record<string, string | string[] | number>;
export type IncomingHttpHeaders = Record<string, string | string[]>;
export type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type PromiseRejType = (d: unknown) => void;
type HeadersInit = Record<string, string>;
export interface IHttpRequestPrms {
    url: string;
    method: HttpRequestMethod;
    headers?: OutgoingHttpHeaders;
    data?: string | object | Buffer | Uint8Array;
    resProcessor?: (res: any, resolve: PromiseRejType, reject: PromiseRejType) => {};
    resDataProcessor?: (res: IHttpResponseType, resolve: PromiseRejType, reject: PromiseRejType) => void;
    followRedirect?: boolean;
}

export interface IHttpResponseType {
    data: string | Buffer | Uint8Array | object;
    url: string;
    headers: IncomingHttpHeaders;
    complete: boolean;
    requestData: string | object;
    statusCode?: number;
    statusMessage?: string;
}

export function getFormData(obj: { [id: string]: any }): (string | null) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    const data = keys.map(key => {
        return `${key}=${encodeURIComponent(obj[key])}`;
    }).join('&')
    return data;
}

export async function doHttpRequest(
    requestPrms: IHttpRequestPrms): Promise<IHttpResponseType> {
    
    if (isBrowser) {
        return doHttpRequestBrowser(requestPrms);
    } else {
        return doHttpRequestNode(requestPrms);
    }
}

// Browser implementation using fetch API
async function doHttpRequestBrowser(requestPrms: IHttpRequestPrms): Promise<IHttpResponseType> {
    const rspDataProcessor = requestPrms.resDataProcessor || ((rspData: IHttpResponseType, resolve: PromiseRejType, reject: PromiseRejType) => {
        const contentType = rspData.headers['content-type'];
        if (contentType && typeof contentType === 'string' && contentType.toLowerCase().indexOf('application/json') >= 0) {
            return resolve({
                ...rspData,
                data: rspData.data ? JSON.parse(typeof rspData.data === 'string' ? rspData.data : new TextDecoder().decode(rspData.data as Uint8Array)) : rspData.data,
            });
        }
        resolve(rspData);
    });

    let { headers, data } = requestPrms;
    const { url, method, followRedirect = true } = requestPrms;

    return new Promise(async (resolve, reject) => {
        try {
            let bodyData: string | Uint8Array | undefined;
            if (data !== null && data !== undefined) {
                if (!headers) headers = {};
                
                if (data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))) {
                    bodyData = data instanceof Uint8Array ? data : new Uint8Array(data);
                } else {
                    if (typeof data !== 'string') {
                        let contentType = '';
                        let isForm = false;
                        for (const key of Object.keys(headers)) {
                            if (key.toLowerCase() === 'content-type') {
                                contentType = headers[key] as string;
                                if (contentType === 'application/x-www-form-urlencoded') {
                                    data = getFormData(data as any);
                                    isForm = true;
                                    break;
                                }
                            }
                        }
                        if (!contentType) {
                            headers['Content-Type'] = 'application/json';
                        }
                        if (!isForm) {
                            data = JSON.stringify(data);
                        }
                    }
                    bodyData = data as string;
                }
            }

            const fetchOptions: RequestInit = {
                method,
                headers: headers as HeadersInit,
                body: bodyData,
                redirect: followRedirect ? 'follow' : 'manual',
            };

            const response = await fetch(url, fetchOptions);
            
            const arrayBuffer = await response.arrayBuffer();
            const dataBuffer = new Uint8Array(arrayBuffer);
            
            // Convert Headers to plain object
            const responseHeaders: IncomingHttpHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            const rspData: IHttpResponseType = {
                headers: responseHeaders,
                url,
                requestData: data,
                data: dataBuffer,
                complete: true,
                statusCode: response.status,
                statusMessage: response.statusText,
            };

            rspDataProcessor(rspData, resolve, reject);
        } catch (err) {
            reject(err);
        }
    });
}


let https: any;
let http: any;

// Node.js implementation using http/https modules
async function doHttpRequestNode(requestPrms: IHttpRequestPrms): Promise<IHttpResponseType> {
    if (!https) {
        https = await import('https');
        http = await import('http');
    }
    
    const rspDataProcessor = requestPrms.resDataProcessor || ((rspData: IHttpResponseType, resolve: PromiseRejType, reject: PromiseRejType) => {
        const contentType = rspData.headers['content-type'];
        if (contentType && typeof contentType === 'string' && contentType.toLowerCase().indexOf('application/json') >= 0) {
            return resolve({
                ...rspData,
                data: rspData.data ? JSON.parse((rspData.data as Buffer).toString('utf-8')) : rspData.data,
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
                    let contentType = '';
                    let isForm = false;
                    for (const key of Object.keys(headers)) {
                        if (key.toLowerCase() === 'content-type') {
                            contentType = headers[key] as string;
                            if (contentType === 'application/x-www-form-urlencoded') {
                                data = getFormData(data as any);
                                isForm = true;
                                break;
                            }
                        }
                    }
                    if (!contentType) {                        
                        headers['Content-Type'] = 'application/json';                        
                    }
                    if (!isForm) {
                        data = JSON.stringify(data);
                    }
                }
                dataToSent = Buffer.from(data as string, 'utf-8');
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


