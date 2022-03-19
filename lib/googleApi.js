"use strict";
//rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
//opts = { access_type: 'offline', scope: 'https://www.googleapis.com/auth/spreadsheets', response_type: 'code', client_id: 'client_id', redirect_uri: 'urn:ietf:wg:oauth:2.0:oob' }
//return rootUrl + '?' + querystring.stringify(opts);
//'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&response_type=code&client_id=client_id&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob'
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = exports.getClientByEnv = exports.getClientCredsByEnv = exports.getClient = exports.getTokenFromCode = exports.getFormData = void 0;
var axios_1 = __importDefault(require("axios"));
function getFormData(obj) {
    if (!obj)
        return null;
    var keys = Object.keys(obj);
    var data = keys.map(function (key) {
        var v = obj[key];
        if (typeof v === 'number')
            v = '' + v;
        return "".concat(key, "=").concat(encodeURIComponent(obj[key]));
    }).join('&');
    return data;
}
exports.getFormData = getFormData;
function getTokenFromCode(creds, code, redirect_uri) {
    return __awaiter(this, void 0, void 0, function () {
        var client_id, client_secret, dataStr, tokenBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client_id = creds.client_id, client_secret = creds.client_secret;
                    dataStr = getFormData({
                        client_secret: client_secret,
                        client_id: client_id,
                        code: code,
                        redirect_uri: redirect_uri,
                        grant_type: 'authorization_code'
                    });
                    return [4 /*yield*/, axios_1.default.post('https://oauth2.googleapis.com/token', dataStr, { headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(function (r) {
                            return r.data;
                        })];
                case 1:
                    tokenBody = _a.sent();
                    return [2 /*return*/, tokenBody];
            }
        });
    });
}
exports.getTokenFromCode = getTokenFromCode;
function doRefresh(creds) {
    return __awaiter(this, void 0, void 0, function () {
        var refresh_token, client_id, client_secret, dataStr, refreshBody, access_token, expires_in, token_type, doOp, doPost, doBatchUpdate, append, read;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    refresh_token = creds.refresh_token, client_id = creds.client_id, client_secret = creds.client_secret;
                    dataStr = getFormData({
                        client_secret: client_secret,
                        client_id: client_id,
                        refresh_token: refresh_token,
                        grant_type: 'refresh_token'
                    });
                    return [4 /*yield*/, axios_1.default.post('https://oauth2.googleapis.com/token', dataStr, { headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(function (r) {
                            return r.data;
                        })];
                case 1:
                    refreshBody = _a.sent();
                    access_token = refreshBody.access_token, expires_in = refreshBody.expires_in, token_type = refreshBody.token_type;
                    doOp = function (op, id, postFix, data) {
                        return (0, axios_1.default)({
                            url: "https://sheets.googleapis.com/v4/spreadsheets/".concat(id).concat(postFix),
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": "Bearer ".concat(access_token),
                            },
                            method: op,
                            data: data,
                        }).then(function (r) {
                            return (r.data);
                        });
                    };
                    doPost = function (id, postFix, data) { return doOp('post', id, postFix, data); };
                    doBatchUpdate = function (id, data) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, doPost(id, ':batchUpdate', data)];
                    }); }); };
                    append = function (_a, data, opts) {
                        var id = _a.id, range = _a.range;
                        return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (!opts) {
                                            opts = {};
                                        }
                                        if (!opts.valueInputOption)
                                            opts.valueInputOption = 'USER_ENTERED';
                                        return [4 /*yield*/, doPost(id, "/values/".concat(range, ":append?").concat(getFormData(opts)), { values: data })];
                                    case 1: return [2 /*return*/, _b.sent()];
                                }
                            });
                        });
                    };
                    read = function (_a) {
                        var id = _a.id, range = _a.range;
                        return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                            return [2 /*return*/, doOp('get', id, "/values/".concat(range))];
                        }); });
                    };
                    return [2 /*return*/, {
                            access_token: access_token,
                            expires_on: new Date().getTime() + (expires_in * 1000 - 2000),
                            token_type: token_type,
                            doBatchUpdate: doBatchUpdate,
                            append: append,
                            read: read,
                            getSheeOps: function (id) {
                                return {
                                    doBatchUpdate: function (data) { return doBatchUpdate(id, data); },
                                    append: function (range, data, ops) { return append({ id: id, range: range }, data, ops); },
                                    read: function (range) { return read({ id: id, range: range }); },
                                };
                            }
                        }];
            }
        });
    });
}
var clients = {};
function getClient(creds) {
    return __awaiter(this, void 0, void 0, function () {
        var name, client, now;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    name = creds.client_id;
                    client = clients[name];
                    now = new Date().getTime();
                    if (!(!client || client.expires_on <= now)) return [3 /*break*/, 2];
                    return [4 /*yield*/, doRefresh(creds)];
                case 1:
                    client = _a.sent();
                    if (!client)
                        return [2 /*return*/, null];
                    clients[name] = client;
                    _a.label = 2;
                case 2: return [2 /*return*/, client];
            }
        });
    });
}
exports.getClient = getClient;
function getClientCredsByEnv(envName) {
    var creds = {
        client_id: process.env["google.".concat(envName, ".client_id")],
        client_secret: process.env["google.".concat(envName, ".client_secret")],
    };
    return creds;
}
exports.getClientCredsByEnv = getClientCredsByEnv;
function getClientByEnv(envName) {
    return __awaiter(this, void 0, void 0, function () {
        var creds;
        return __generator(this, function (_a) {
            creds = {
                client_id: process.env["google.".concat(envName, ".client_id")],
                client_secret: process.env["google.".concat(envName, ".client_secret")],
                refresh_token: process.env["google.".concat(envName, ".refresh_token")],
            };
            return [2 /*return*/, getClient(creds)];
        });
    });
}
exports.getClientByEnv = getClientByEnv;
function test(d) {
    return __awaiter(this, void 0, void 0, function () {
        var cli, id, upres, appres, rres, sheet, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getClientByEnv('gzprem')];
                case 1:
                    cli = _c.sent();
                    if (!cli)
                        return [2 /*return*/, console.log('failed to get client')];
                    id = '1MO27odjCsxk6MWL0DygubU53hrtt3OB8SEnqjpUHJ-U';
                    if (d)
                        return [2 /*return*/];
                    console.log('do batch update');
                    return [4 /*yield*/, cli.doBatchUpdate(id, {
                            "requests": [
                                {
                                    "updateDimensionProperties": {
                                        "range": {
                                            "sheetId": 0,
                                            "dimension": "COLUMNS",
                                            "startIndex": 0,
                                            "endIndex": 1
                                        },
                                        "properties": {
                                            "pixelSize": 160
                                        },
                                        "fields": "pixelSize"
                                    },
                                }
                            ]
                        })];
                case 2:
                    _c.sent();
                    console.log('do batch update 2');
                    return [4 /*yield*/, cli.doBatchUpdate(id, {
                            "requests": [
                                {
                                    "updateCells": {
                                        "fields": "*",
                                        "range": {
                                            "sheetId": 0,
                                            "startColumnIndex": 0,
                                            "endColumnIndex": 10,
                                            "startRowIndex": 0,
                                            "endRowIndex": 10
                                        },
                                        "rows": [
                                            {
                                                "values": [
                                                    {
                                                        "userEnteredFormat": {
                                                            "backgroundColor": {
                                                                "blue": 10,
                                                                "green": 10,
                                                                "red": 255
                                                            },
                                                            "borders": {
                                                                "bottom": {
                                                                    "style": "SOLID",
                                                                    "width": 8,
                                                                    "color": {
                                                                        "blue": 0,
                                                                        "green": 255,
                                                                        "red": 0
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        "userEnteredValue": { "stringValue": "strstsdfasdf" }
                                                    },
                                                    {
                                                        "userEnteredValue": { "stringValue": "col1" }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            ]
                        })];
                case 3:
                    upres = _c.sent();
                    console.log(upres);
                    console.log('append 1');
                    return [4 /*yield*/, cli.append({
                            id: id,
                            range: "'Sheet1'!A1:B2"
                        }, [
                            ['aaa', 'bbb1']
                        ])];
                case 4:
                    appres = _c.sent();
                    console.log('append res');
                    console.log(appres);
                    console.log('read');
                    return [4 /*yield*/, cli.read({
                            id: id,
                            range: 'A1:B4'
                        })];
                case 5:
                    rres = _c.sent();
                    console.log('read res');
                    console.log(rres);
                    sheet = cli.getSheeOps(id);
                    sheet.doBatchUpdate({
                        "requests": [
                            {
                                "updateDimensionProperties": {
                                    "range": {
                                        "sheetId": 0,
                                        "dimension": "COLUMNS",
                                        "startIndex": 0,
                                        "endIndex": 1
                                    },
                                    "properties": {
                                        "pixelSize": 100
                                    },
                                    "fields": "pixelSize"
                                },
                            }
                        ]
                    });
                    return [4 /*yield*/, sheet.append('A:B', [['c', 'D']])];
                case 6:
                    _c.sent();
                    _b = (_a = console).log;
                    return [4 /*yield*/, sheet.read('A1:B4')];
                case 7:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        });
    });
}
exports.test = test;
//test().catch(err => {
//   console.log(err.response.text);
//})
/*
async function test2() {
    const creds = getClientCredsByEnv('gzperm');
    await getTokenFromCode(creds, '4/xxxx', 'http://localhost:3000');
}
console.log('invoking test2')
test2().catch(err => {
    console.log('error');
    //console.log(err);
   console.log(err.response.text || err.response.data);
})
*/ 
