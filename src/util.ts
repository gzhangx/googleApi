
export function getFormData(obj: { [id: string]: any }): (string|null) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    const data = keys.map(key => {        
        return `${key}=${encodeURIComponent(obj[key])}`;
    }).join('&')
    return data;
}

export function sleep(ms: number) {
    return new Promise(resolve => {
        setTimeout(resolve, ms); 
    });
}

const CHARCODE_A = 'A'.charCodeAt(0);
export const xcelPositionToColumnName = (pos:number) => {
    let res = '';
    while (true) {
        const mod = pos % 26;
        res = String.fromCharCode(CHARCODE_A + mod) + res;
        pos = Math.floor(pos / 26);
        if (!pos) break;
        pos--;
    }
    return res;
}

export * from './httpRequest'