"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestamp = getTimestamp;
exports.dbRun = dbRun;
exports.dbGet = dbGet;
exports.dbAll = dbAll;
function getTimestamp() {
    return new Date().toISOString();
}
function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows || []);
        });
    });
}
