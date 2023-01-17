import * as buffer from "buffer";

import https from 'https';
import http, { IncomingHttpHeaders } from 'http';

export type OutgoingHttpHeaders = http.OutgoingHttpHeaders;
export type HttpRequestMethod ='GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export interface IHttpRequestPrms {
    url: string,
    method: HttpRequestMethod,
    headers?: http.OutgoingHttpHeaders,
    data?: string | object,
    resProcessor?: (res: http.IncomingMessage, resolve: (unknown)=>void, reject: (unknown)=>void)=>{},
}

export interface IHttpResponseType {
    data: string | object;
    url: string;
    headers: IncomingHttpHeaders;
}
export async function doHttpRequest(
    {url, method, headers, data,
                           resProcessor,
    }: IHttpRequestPrms): Promise<IHttpResponseType>
{
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        let httpRequest = https.request;
        if (urlObj.protocol === 'http') {
            httpRequest = http.request;
        }
        if (data !== null && data !== undefined) {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            headers['Content-Length'] = data.length;
        }
        const req = httpRequest({
            hostname: urlObj.hostname,
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
                res.on('end', () => {
                    if (!res.complete)
                        reject({
                            message: 'The connection was terminated while the message was still being sent',
                            url,
                            method,
                            data,
                        });
                    else {
                        const contentType = res.headers['content-type'];
                        if (contentType && contentType.toLowerCase().indexOf('application/json') >= 0) {
                            return resolve({
                                data: JSON.parse(allData),
                                headers: res.headers,
                                url,
                            });
                        }
                        resolve({
                            headers: res.headers,
                            data: allData,
                            url,
                        });
                    }
                });
            }
        });
        if (data) {
            req.write(data);
        }
        req.end();
    });
}


