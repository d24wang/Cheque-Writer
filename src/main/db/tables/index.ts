import * as checks from './checks';
import * as checkTemplates from './checkTemplates';
import * as profiles from './profiles';

// order is important for schema initialization due to foreign key constraints
const schemas = [
    profiles.schema,
    checkTemplates.schema,
    checks.schema
];

export {
    schemas,
    checks,
    checkTemplates,
    profiles
};