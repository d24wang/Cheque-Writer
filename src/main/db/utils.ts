import { Database, RunResult } from 'sqlite3';

export function getTimestamp(): string {
    return new Date().toISOString();
}

export function dbRun(db: Database, sql: string, params: unknown[] = []): Promise<{ id: number; changes: number; }> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (this: RunResult, err: Error | null) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

export function dbGet<T>(db: Database, sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err: Error | null, row: T) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

export function dbAll<T>(db: Database, sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err: Error | null, rows: T[]) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}