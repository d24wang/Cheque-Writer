"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.initCheckFunctions = initCheckFunctions;
const utils_1 = require("../utils");
exports.schema = `
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
;
async function _createCheck(db, templateId, checkNumber, payTo, amount, memo, date) {
    const now = (0, utils_1.getTimestamp)();
    const result = await (0, utils_1.dbRun)(db, `INSERT INTO checks (template_id, check_number, pay_to, amount, memo, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [templateId, checkNumber ?? null, payTo ?? null, amount ?? null, memo ?? null, date ?? null, now, now]);
    return { id: result.id, template_id: templateId };
}
async function _getChecksByTemplateId(db, templateId) {
    return (0, utils_1.dbAll)(db, 'SELECT * FROM checks WHERE template_id = ? ORDER BY created_at DESC', [templateId]);
}
async function _getCheckById(db, id) {
    return (0, utils_1.dbGet)(db, 'SELECT * FROM checks WHERE id = ?', [id]);
}
async function _updateCheck(db, id, updates) {
    const now = (0, utils_1.getTimestamp)();
    const allowedFields = ['check_number', 'pay_to', 'amount', 'memo', 'date'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (fields.length === 0)
        return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(now, id);
    await (0, utils_1.dbRun)(db, `UPDATE checks SET ${setClause}, updated_at = ? WHERE id = ?`, values);
    return _getCheckById(db, id);
}
async function _deleteCheck(db, id) {
    await (0, utils_1.dbRun)(db, 'DELETE FROM checks WHERE id = ?', [id]);
}
async function _getChecksByProfileId(db, profileId) {
    return (0, utils_1.dbAll)(db, `SELECT c.* FROM checks c
         JOIN check_templates t ON c.template_id = t.id
         WHERE t.profile_id = ?
         ORDER BY c.created_at DESC`, [profileId]);
}
function initCheckFunctions(db) {
    return {
        createCheck: (templateId, checkNumber, payTo, amount, memo, date) => _createCheck(db, templateId, checkNumber, payTo, amount, memo, date),
        getChecksByTemplateId: (templateId) => _getChecksByTemplateId(db, templateId),
        getCheckById: (id) => _getCheckById(db, id),
        updateCheck: (id, updates) => _updateCheck(db, id, updates),
        deleteCheck: (id) => _deleteCheck(db, id),
        getChecksByProfileId: (profileId) => _getChecksByProfileId(db, profileId)
    };
}
