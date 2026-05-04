import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { schemas } from './tables';

sqlite3.verbose();

let db: sqlite3.Database | null = null;

export function initDatabase(dbPath: string): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
            } else {
                db!.run('PRAGMA foreign_keys = ON', (pragmaErr: Error | null) => {
                    if (pragmaErr) {
                        reject(pragmaErr);
                    } else {
                        _createTables()
                            .then(() => resolve(db!))
                            .catch(reject);
                    }
                });
            }
        });
    });
}

async function _createTables(): Promise<void> {
    const createSchema = schemas.join('\n');

    return new Promise((resolve, reject) => {
        db!.exec(createSchema, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function closeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                db = null;
                if (err) reject(err);
                else resolve();
            });
        } else {
            resolve();
        }
    });
}
