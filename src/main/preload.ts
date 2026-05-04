import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Native app menu events
    menu: {
        onNewProfile: (callback: () => void) => {
            const listener = () => callback();
            ipcRenderer.on('menu:new-profile', listener);
            return () => {
                ipcRenderer.removeListener('menu:new-profile', listener);
            };
        }
    },

    // Profile APIs
    profiles: {
        list: () => ipcRenderer.invoke('db:profiles:list'),
        create: (profileName: string, name: string | null) =>
            ipcRenderer.invoke('db:profiles:create', profileName, name),
        get: (id: number) => ipcRenderer.invoke('db:profiles:get', id),
        update: (id: number, updates: Record<string, unknown>) => ipcRenderer.invoke('db:profiles:update', id, updates),
        delete: (id: number) => ipcRenderer.invoke('db:profiles:delete', id)
    },

    // Native dialog APIs
    dialog: {
        pickImageFile: () => ipcRenderer.invoke('dialog:pickImageFile')
    },

    // Check Template APIs
    templates: {
        list: (profileId: number) => ipcRenderer.invoke('db:templates:list', profileId),
        create: (profileId: number, templateName: string, width: number | null, height: number | null, bankName: string | null, routingNumber: string | null, accountNumber: string | null) =>
            ipcRenderer.invoke('db:templates:create', profileId, templateName, width, height, bankName, routingNumber, accountNumber),
        get: (id: number) => ipcRenderer.invoke('db:templates:get', id),
        update: (id: number, updates: Record<string, unknown>) => ipcRenderer.invoke('db:templates:update', id, updates),
        delete: (id: number) => ipcRenderer.invoke('db:templates:delete', id),
        saveCheckImage: (templateId: number, profileId: number, sourcePath: string, ext: string) =>
            ipcRenderer.invoke('db:templates:saveCheckImage', templateId, profileId, sourcePath, ext),
        getCheckImageDataUrl: (templateId: number, profileId: number) =>
            ipcRenderer.invoke('db:templates:getCheckImageDataUrl', templateId, profileId),
        saveCheckMeta: (templateId: number, profileId: number, savePath: string, fieldData: unknown) =>
            ipcRenderer.invoke('db:templates:saveCheckMeta', templateId, profileId, savePath, fieldData),
        getCheckMeta: (templateId: number, profileId: number, savePath: string) =>
            ipcRenderer.invoke('db:templates:getCheckMeta', templateId, profileId, savePath)
    },

    // Check APIs
    checks: {
        list: (templateId: number) => ipcRenderer.invoke('db:checks:list', templateId),
        listByProfile: (profileId: number) => ipcRenderer.invoke('db:checks:listByProfile', profileId),
        create: (templateId: number, checkNumber: string | null, payTo: string | null, amount: number | null, memo: string | null, date: string | null) =>
            ipcRenderer.invoke('db:checks:create', templateId, checkNumber, payTo, amount, memo, date),
        get: (id: number) => ipcRenderer.invoke('db:checks:get', id),
        update: (id: number, updates: Record<string, unknown>) => ipcRenderer.invoke('db:checks:update', id, updates),
        delete: (id: number) => ipcRenderer.invoke('db:checks:delete', id)
    }
});
