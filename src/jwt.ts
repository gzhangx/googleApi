import { createPrivateKey, createSign } from 'crypto';

interface HEADER {
    alg: 'RS256';
    //kid:undefined,
    typ: 'JWT';
}

export interface Payload {
    typ?: 'JWT';
    aud?: string;
    iss?: string;
    jti?: string;
    sub?: string;
    iat?: number;
    exp: number;
    kid?: string;
};

export function signRs256(pk: string, payload: Payload) {
    if (!payload.typ) payload.typ = 'JWT';
    const header: HEADER = {
        alg: 'RS256',
        //kid:undefined,
        typ: 'JWT'
    };
    const privateKey = createPrivateKey(pk)
    if (privateKey.type !== 'private') {
        throw new Error((`bad privateKey ${privateKey.type} should be private`));
    }
    const timestamp = payload.iat || Math.floor(Date.now() / 1000);
    payload.iat = timestamp;
    payload.exp = payload.exp + timestamp;

    function sign(content: string) {
        var signer = createSign('RSA-SHA256');
        var sig = (signer.update(content), signer.sign(privateKey, 'base64'));
        return sig.replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    function tobase64url(obj: any, encoding: BufferEncoding) {
        return Buffer
            .from(JSON.stringify(obj), encoding)
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    function getJwtHeaderStr(payload: any) {
        var encodedHeader = tobase64url(header, 'binary');
        var encodedPayload = tobase64url(payload, 'utf-8');
        return `${encodedHeader}.${encodedPayload}`;
    }

    const headerStr = getJwtHeaderStr(payload);
    const signed = sign(headerStr);
    const mres = `${headerStr}.${signed}`;
    return mres;
}