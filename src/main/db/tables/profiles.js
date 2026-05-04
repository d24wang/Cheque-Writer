"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.initProfileFunctions = initProfileFunctions;
const utils_1 = require("../utils");
exports.schema = `
    CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_name TEXT NOT NULL UNIQUE,
        name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`;
async function _createProfile(db, profileName, name) {
    const now = (0, utils_1.getTimestamp)();
    const result = await (0, utils_1.dbRun)(db, `INSERT INTO profiles (profile_name, name, created_at, updated_at)
         VALUES (?, ?, ?, ?)`, [profileName, name ?? null, now, now]);
    return { id: result.id, profile_name: profileName };
}
async function _getProfiles(db) {
    return (0, utils_1.dbAll)(db, 'SELECT * FROM profiles ORDER BY created_at ASC');
}
async function _getProfileById(db, id) {
    return (0, utils_1.dbGet)(db, 'SELECT * FROM profiles WHERE id = ?', [id]);
}
async function _getProfileByName(db, profileName) {
    return (0, utils_1.dbGet)(db, 'SELECT * FROM profiles WHERE profile_name = ?', [profileName]);
}
async function _updateProfile(db, id, updates) {
    const now = (0, utils_1.getTimestamp)();
    const allowedFields = ['profile_name', 'name'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (fields.length === 0)
        return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(now, id);
    await (0, utils_1.dbRun)(db, `UPDATE profiles SET ${setClause}, updated_at = ? WHERE id = ?`, values);
    return _getProfileById(db, id);
}
async function _deleteProfile(db, id) {
    await (0, utils_1.dbRun)(db, 'DELETE FROM profiles WHERE id = ?', [id]);
}
function initProfileFunctions(db) {
    return {
        createProfile: (profileName, name) => _createProfile(db, profileName, name),
        getProfiles: () => _getProfiles(db),
        getProfileById: (id) => _getProfileById(db, id),
        getProfileByName: (profileName) => _getProfileByName(db, profileName),
        updateProfile: (id, updates) => _updateProfile(db, id, updates),
        deleteProfile: (id) => _deleteProfile(db, id)
    };
}
