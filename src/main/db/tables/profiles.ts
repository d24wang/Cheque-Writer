import { Database } from 'sqlite3';
import { getTimestamp, dbRun, dbAll, dbGet } from '../utils';

export const schema = `
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_name TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`;

export interface Profile {
    id: number;
    profile_name: string;
    name: string | null;
    created_at: string;
    updated_at: string;
}

type ProfileUpdates = Partial<Pick<Profile, 'profile_name' | 'name'>>;

async function _createProfile(
    db: Database,
    profileName: string,
    name: string | null
): Promise<{ id: number; profile_name: string; }> {
    const now = getTimestamp();
    const result = await dbRun(
        db,
        `INSERT INTO profiles (profile_name, name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [profileName, name ?? null, now, now]
    );
    return { id: result.id, profile_name: profileName };
}

async function _getProfiles(db: Database): Promise<Profile[]> {
    return dbAll<Profile>(db, 'SELECT * FROM profiles ORDER BY created_at ASC');
}

async function _getProfileById(db: Database, id: number): Promise<Profile | undefined> {
    return dbGet<Profile>(db, 'SELECT * FROM profiles WHERE id = ?', [id]);
}

async function _getProfileByName(db: Database, profileName: string): Promise<Profile | undefined> {
    return dbGet<Profile>(db, 'SELECT * FROM profiles WHERE profile_name = ?', [profileName]);
}

async function _updateProfile(db: Database, id: number, updates: ProfileUpdates): Promise<Profile | undefined | null> {
    const now = getTimestamp();
    const allowedFields = ['profile_name', 'name'] as const;
    const fields = (Object.keys(updates) as (keyof ProfileUpdates)[]).filter(k => allowedFields.includes(k as typeof allowedFields[number]));

    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values: unknown[] = fields.map(f => updates[f]);
    values.push(now, id);

    await dbRun(
        db,
        `UPDATE profiles SET ${setClause}, updated_at = ? WHERE id = ?`,
        values
    );
    return _getProfileById(db, id);
}

async function _deleteProfile(db: Database, id: number): Promise<void> {
    await dbRun(db, 'DELETE FROM profiles WHERE id = ?', [id]);
}

export function initProfileFunctions(db: Database) {
    return {
        createProfile: (profileName: string, name: string | null) => _createProfile(db, profileName, name),
        getProfiles: () => _getProfiles(db),
        getProfileById: (id: number) => _getProfileById(db, id),
        getProfileByName: (profileName: string) => _getProfileByName(db, profileName),
        updateProfile: (id: number, updates: ProfileUpdates) => _updateProfile(db, id, updates),
        deleteProfile: (id: number) => _deleteProfile(db, id)
    };
}
