"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.initCheckTemplatesFunctions = initCheckTemplatesFunctions;
const utils_1 = require("../utils");
exports.schema = `
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
async function _createCheckTemplate(db, profileId, templateName, width, height, bankName, routingNumber, accountNumber) {
    const now = (0, utils_1.getTimestamp)();
    const result = await (0, utils_1.dbRun)(db, `INSERT INTO check_templates (profile_id, template_name, width, height, bank_name, routing_number, account_number, has_check_meta, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`, [profileId, templateName, width ?? null, height ?? null, bankName ?? null, routingNumber ?? null, accountNumber ?? null, now, now]);
    return _getTemplateById(db, result.id);
}
async function _getTemplatesByProfileId(db, profileId) {
    return (0, utils_1.dbAll)(db, 'SELECT * FROM check_templates WHERE profile_id = ? ORDER BY created_at DESC', [profileId]);
}
async function _getTemplateById(db, id) {
    return (0, utils_1.dbGet)(db, 'SELECT * FROM check_templates WHERE id = ?', [id]);
}
async function _updateCheckTemplate(db, id, updates) {
    const now = (0, utils_1.getTimestamp)();
    const allowedFields = ['template_name', 'width', 'height', 'bank_name', 'routing_number', 'account_number', 'has_check_meta'];
    const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
    if (fields.length === 0)
        return null;
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    values.push(now, id);
    await (0, utils_1.dbRun)(db, `UPDATE check_templates SET ${setClause}, updated_at = ? WHERE id = ?`, values);
    return _getTemplateById(db, id);
}
async function _deleteCheckTemplate(db, id) {
    await (0, utils_1.dbRun)(db, 'DELETE FROM check_templates WHERE id = ?', [id]);
}
function initCheckTemplatesFunctions(db) {
    return {
        createCheckTemplate: (profileId, templateName, width, height, bankName, routingNumber, accountNumber) => _createCheckTemplate(db, profileId, templateName, width, height, bankName, routingNumber, accountNumber),
        getTemplatesByProfileId: (profileId) => _getTemplatesByProfileId(db, profileId),
        getTemplateById: (id) => _getTemplateById(db, id),
        updateCheckTemplate: (id, updates) => _updateCheckTemplate(db, id, updates),
        deleteCheckTemplate: (id) => _deleteCheckTemplate(db, id)
    };
}
