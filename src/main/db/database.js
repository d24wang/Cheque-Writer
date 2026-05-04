"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.closeDatabase = closeDatabase;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const tables_1 = require("./tables");
sqlite3.verbose();
let db = null;
function initDatabase(dbPath) {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            }
            else {
                db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
                    if (pragmaErr) {
                        reject(pragmaErr);
                    }
                    else {
                        _createTables()
                            .then(() => resolve(db))
                            .catch(reject);
                    }
                });
            }
        });
    });
}
async function _createTables() {
    const createSchema = tables_1.schemas.join('\n');
    return new Promise((resolve, reject) => {
        db.exec(createSchema, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                db = null;
                if (err)
                    reject(err);
                else
                    resolve();
            });
        }
        else {
            resolve();
        }
    });
}
