import { Database } from 'sqlite3';
import { getTimestamp, dbRun, dbAll, dbGet } from '../utils';

export const schema = `
    CREATE TABLE IF NOT EXISTS check_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        width REAL,
        height REAL,
        bank_name TEXT,
        routing_number TEXT,
        account_number TEXT,
        has_check_meta INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        UNIQUE(profile_id, template_name)
    );
`;

export interface CheckTemplate {
    id: number;
    profile_id: number;
    template_name: string;
    width: number | null;
    height: number | null;
    bank_name: string | null;
    routing_number: string | null;
    account_number: string | null;
    has_check_meta: boolean;
    created_at: string;
    updated_at: string;
}

type TemplateUpdates = Partial<Pick<CheckTemplate, 'template_name' | 'width' | 'height' | 'bank_name' | 'routing_number' | 'account_number' | 'has_check_meta'>>;

async function _createCheckTemplate(
    db: Database,
    profileId: number,
    templateName: string,
    width: number | null,
    height: number | null,
    bankName: string | null,
    routingNumber: string | null,
    accountNumber: string | null
): Promise<CheckTemplate | undefined> {
    const now = getTimestamp();
    const result = await dbRun(
        db,
        `INSERT INTO check_templates (profile_id, template_name, width, height, bank_name, routing_number, account_number, has_check_meta, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [profileId, templateName, width ?? null, height ?? null, bankName ?? null, routingNumber ?? null, accountNumber ?? null, now, now]
    );
    return _getTemplateById(db, result.id);
}

async function _getTemplatesByProfileId(db: Database, profileId: number): Promise<CheckTemplate[]> {
    return dbAll<CheckTemplate>(db, 'SELECT * FROM check_templates WHERE profile_id = ? ORDER BY created_at DESC', [profileId]);
}

async function _getTemplateById(db: Database, id: number): Promise<CheckTemplate | undefined> {
    return dbGet<CheckTemplate>(db, 'SELECT * FROM check_templates WHERE id = ?', [id]);
}

async function _updateCheckTemplate(db: Database, id: number, updates: TemplateUpdates): Promise<CheckTemplate | undefined | null> {
    const now = getTimestamp();
    const allowedFields = ['template_name', 'width', 'height', 'bank_name', 'routing_number', 'account_number', 'has_check_meta'] as const;
    const fields = (Object.keys(updates) as (keyof TemplateUpdates)[]).filter(k => allowedFields.includes(k as typeof allowedFields[number]));

    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map(f => updates[f]);
    values.push(now, id);

    await dbRun(
        db,
        `UPDATE check_templates SET ${setClause}, updated_at = ? WHERE id = ?`,
        values
    );
    return _getTemplateById(db, id);
}

async function _deleteCheckTemplate(db: Database, id: number): Promise<void> {
    await dbRun(db, 'DELETE FROM check_templates WHERE id = ?', [id]);
}

export function initCheckTemplatesFunctions(db: Database) {
    return {
        createCheckTemplate: (profileId: number, templateName: string, width: number | null, height: number | null, bankName: string | null, routingNumber: string | null, accountNumber: string | null) =>
            _createCheckTemplate(db, profileId, templateName, width, height, bankName, routingNumber, accountNumber),
        getTemplatesByProfileId: (profileId: number) => _getTemplatesByProfileId(db, profileId),
        getTemplateById: (id: number) => _getTemplateById(db, id),
        updateCheckTemplate: (id: number, updates: TemplateUpdates) => _updateCheckTemplate(db, id, updates),
        deleteCheckTemplate: (id: number) => _deleteCheckTemplate(db, id)
    };
}