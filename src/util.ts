export function getFormData(obj: { [id: string]: any }): (string|null) {
    if (!obj) return null;
    const keys = Object.keys(obj);
    const data = keys.map(key => {        
        return `${key}=${encodeURIComponent(obj[key])}`;
    }).join('&')
    return data;
}