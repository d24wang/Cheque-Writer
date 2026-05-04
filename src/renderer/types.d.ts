export interface ElectronAPI {

    dialog: {
        pickImageFile: () => Promise<{ filePath: string; dataUrl: string; } | null>;
    };
    menu: {
        onNewProfile: (callback: () => void) => () => void;
    };
    profiles: {
        list: () => Promise<Profile[]>;
        create: (profileName: string, name: string | null) => Promise<{ id: number; profile_name: string; }>;
        get: (id: number) => Promise<Profile | undefined>;
        update: (id: number, updates: Record<string, unknown>) => Promise<Profile | undefined | null>;
        delete: (id: number) => Promise<{ success: boolean; }>;
    };
    templates: {
        list: (profileId: number) => Promise<CheckTemplate[]>;
        create: (profileId: number, templateName: string, width: number | null, height: number | null, bankName: string | null, routingNumber: string | null, accountNumber: string | null) => Promise<CheckTemplate | undefined>;
        get: (id: number) => Promise<CheckTemplate | undefined>;
        update: (id: number, updates: Record<string, unknown>) => Promise<CheckTemplate | undefined | null>;
        delete: (id: number) => Promise<{ success: boolean; }>;
        saveCheckImage: (templateId: number, profileId: number, sourcePath: string, ext: string) => Promise<CheckTemplate | undefined | null>;
        getCheckImageDataUrl: (templateId: number, profileId: number) => Promise<string | null>;
        saveCheckMeta: (templateId: number, profileId: number, savePath: string, fieldData: unknown) => Promise<{ success: boolean; }>;
        getCheckMeta: (templateId: number, profileId: number, savePath: string) => Promise<unknown[] | null>;
    };
    checks: {
        list: (templateId: number) => Promise<Check[]>;
        listByProfile: (profileId: number) => Promise<Check[]>;
        create: (templateId: number, checkNumber: string | null, payTo: string | null, amount: number | null, memo: string | null, date: string | null) => Promise<{ id: number; template_id: number; }>;
        get: (id: number) => Promise<Check | undefined>;
        update: (id: number, updates: Record<string, unknown>) => Promise<Check | undefined | null>;
        delete: (id: number) => Promise<{ success: boolean; }>;
    };
}

export interface Profile {
    id: number;
    profile_name: string;
    name: string | null;
    created_at: string;
    updated_at: string;
}

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
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}
