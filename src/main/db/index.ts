import { initDatabase, closeDatabase } from './database';
import * as tables from './tables';

export async function createDb(dbPath: string) {
    const db = await initDatabase(dbPath);
    return {
        close: () => closeDatabase(),
        profiles: tables.profiles.initProfileFunctions(db!),
        templates: tables.checkTemplates.initCheckTemplatesFunctions(db!),
        checks: tables.checks.initCheckFunctions(db!),
    };
}