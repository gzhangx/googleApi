
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

export function get(obj: any, path: string[]|string) {
    if (!obj) return obj;
    if (!path || !path.length) return obj;
    if (typeof path === 'string') {
        return get(obj, path.split('.'));
    }
    const [p1, ...po] = path;
    return get(obj[p1], po);
}

export function set(obj: any, path:string|string[], val: any) {
    if (!path || !path.length) return;
    if (typeof path === 'string') {
        set(obj, path.split('.'), val);
    } else {
        const [p1, ...po] = path;
        if (!po.length) {
            obj[p1] = val;
        } else {
            let rt = obj[p1];
            if (!rt) {
                rt = {};
                obj[p1] = rt;
            }
            set(rt, po, val);
        }
    }
}

export function pick(obj: any, path: string[]) {
    if (!path) return obj;
    const res = {} as any;
    for (const key of path) {
        const val = get(obj, key);
        if (val || val === 0) {
            set(res, key, val);
        }
    }
    return res;
}