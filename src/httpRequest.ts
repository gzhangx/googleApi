import * as https from 'https';
import * as http from 'http';

export type OutgoingHttpHeaders = http.OutgoingHttpHeaders;
export type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export interface IHttpRequestPrms {
    url: string,
    method: HttpRequestMethod,
    headers?: http.OutgoingHttpHeaders,
    data?: string | object,
    resProcessor?: (res: http.IncomingMessage, resolve: (d: any) => void, reject: (d: unknown) => void) => {},
}

export interface IHttpResponseType {
    data: string | object;
    url: string;
    headers: http.IncomingHttpHeaders;
    complete: boolean;
    requestData: string | object;
    statusCode?: number;
    statusMessage?: string;
}
export async function doHttpRequest(
    { url, method, headers, data,
        resProcessor,
    }: IHttpRequestPrms): Promise<IHttpResponseType> {
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
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }            
            dataToSent = Buffer.from(data, 'utf-8');
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
                res.setEncoding('utf8');
                let allData = '';
                res.on('data', d => {
                    allData += d.toString();
                });
                res.on('error', err => {
                    reject(err);
                });
                res.on('end', () => {
                    const rspData = {
                        headers: res.headers,
                        url,
                        requestData: data,
                        data: allData,
                        complete: res.complete,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                    }

                    const contentType = res.headers['content-type'];
                    if (contentType && contentType.toLowerCase().indexOf('application/json') >= 0) {
                        return resolve({
                            ...rspData,
                            data: JSON.parse(allData),
                        });
                    }
                    resolve(rspData);

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


