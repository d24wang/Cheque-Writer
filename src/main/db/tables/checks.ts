import { Database } from 'sqlite3';
import { getTimestamp, dbRun, dbAll, dbGet } from '../utils';

export const schema = `
    CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        check_number TEXT,
        pay_to TEXT,
        amount REAL,
        memo TEXT,
        date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES check_templates(id) ON DELETE CASCADE
    );
`;

export interface Check {
    id: number;
    template_id: number;
    check_number: string | null;
    pay_to: string | null;
    amount: number | null;
    memo: string | null;
    date: string | null;
    created_at: string;
    updated_at: string;
};

type CheckUpdates = Partial<Pick<Check, 'check_number' | 'pay_to' | 'amount' | 'memo' | 'date'>>;

async function _createCheck(
    db: Database,
    templateId: number,
    checkNumber: string | null,
    payTo: string | null,
    amount: number | null,
    memo: string | null,
    date: string | null
): Promise<{ id: number; template_id: number; }> {
    const now = getTimestamp();
    const result = await dbRun(
        db,
        `INSERT INTO checks (template_id, check_number, pay_to, amount, memo, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, checkNumber ?? null, payTo ?? null, amount ?? null, memo ?? null, date ?? null, now, now]
    );
    return { id: result.id, template_id: templateId };
}

async function _getChecksByTemplateId(db: Database, templateId: number): Promise<Check[]> {
    return dbAll<Check>(db, 'SELECT * FROM checks WHERE template_id = ? ORDER BY created_at DESC', [templateId]);
}

async function _getCheckById(db: Database, id: number): Promise<Check | undefined> {
    return dbGet<Check>(db, 'SELECT * FROM checks WHERE id = ?', [id]);
}

async function _updateCheck(db: Database, id: number, updates: CheckUpdates): Promise<Check | undefined | null> {
    const now = getTimestamp();
    const allowedFields = ['check_number', 'pay_to', 'amount', 'memo', 'date'] as const;
    const fields = (Object.keys(updates) as (keyof CheckUpdates)[]).filter(k => allowedFields.includes(k as typeof allowedFields[number]));

    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map(f => updates[f]);
    values.push(now, id);

    await dbRun(
        db,
        `UPDATE checks SET ${setClause}, updated_at = ? WHERE id = ?`,
        values
    );
    return _getCheckById(db, id);
}

async function _deleteCheck(db: Database, id: number): Promise<void> {
    await dbRun(db, 'DELETE FROM checks WHERE id = ?', [id]);
}

async function _getChecksByProfileId(db: Database, profileId: number): Promise<Check[]> {
    return dbAll<Check>(
        db,
        `SELECT c.* FROM checks c
         JOIN check_templates t ON c.template_id = t.id
         WHERE t.profile_id = ?
         ORDER BY c.created_at DESC`,
        [profileId]
    );
}

export function initCheckFunctions(db: Database) {
    return {
        createCheck: (templateId: number, checkNumber: string | null, payTo: string | null, amount: number | null, memo: string | null, date: string | null) =>
            _createCheck(db, templateId, checkNumber, payTo, amount, memo, date),
        getChecksByTemplateId: (templateId: number) => _getChecksByTemplateId(db, templateId),
        getCheckById: (id: number) => _getCheckById(db, id),
        updateCheck: (id: number, updates: CheckUpdates) => _updateCheck(db, id, updates),
        deleteCheck: (id: number) => _deleteCheck(db, id),
        getChecksByProfileId: (profileId: number) => _getChecksByProfileId(db, profileId)
    };
}
