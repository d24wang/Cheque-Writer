import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as db from './db';

function getMetaRoot(): string {
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    return isDev
        ? path.join(app.getAppPath(), 'tmp')
        : app.getPath('userData');
}

function getDBPath(): string {
    const rootDir = getMetaRoot();
    return path.join(rootDir, 'check_writer.db');
}

function getImageMimeTypeFromExtension(ext: string): string {
    const normalized = ext.toLowerCase();
    if (normalized === 'jpg' || normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'gif') return 'image/gif';
    if (normalized === 'webp') return 'image/webp';
    return 'image/png';
}

let mainWindow: BrowserWindow | null = null;

function openNewProfileFromMenu(): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('menu:new-profile');
}

function buildApplicationMenu(): void {
    const fileSubmenu: MenuItemConstructorOptions[] = [
        {
            label: 'New Profile',
            accelerator: 'CmdOrCtrl+N',
            click: openNewProfileFromMenu
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
    ];

    const template: (MenuItemConstructorOptions | MenuItem)[] = [];

    if (process.platform === 'darwin') {
        template.push({ role: 'appMenu' });
    }

    template.push({ label: 'File', submenu: fileSubmenu });
    template.push({ role: 'editMenu' });
    template.push({ role: 'viewMenu' });
    template.push({ role: 'windowMenu' });

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'Cheque Writer'
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }
}

type AppDb = Awaited<ReturnType<typeof db.createDb>>;
let appDb: AppDb | null = null;

app.whenReady().then(async () => {
    try {
        appDb = await db.createDb(getDBPath());
        createWindow();
        buildApplicationMenu();

        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                appDb = await db.createDb(getDBPath());
                createWindow();
            }
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', (event) => {
    if (appDb == null) return;
    event.preventDefault();
    const closing = appDb;
    appDb = null;
    closing.close().catch((error) => {
        console.error('Error closing database:', error);
    }).finally(() => {
        app.quit();
    });
});

// ==================== PROFILE IPC HANDLERS ====================

ipcMain.handle('db:profiles:list', async () => {
    try {
        return await appDb!.profiles.getProfiles();
    } catch (error) {
        console.error('Error fetching profiles:', error);
        throw error;
    }
});

ipcMain.handle('db:profiles:create', async (_event, profileName: string, name: string, address: string, bankName: string, routingNumber: string, accountNumber: string) => {
    try {
        return await appDb!.profiles.createProfile(profileName, name);
    } catch (error) {
        console.error('Error creating profile:', error);
        throw error;
    }
});

ipcMain.handle('db:profiles:get', async (_event, id: number) => {
    try {
        return await appDb!.profiles.getProfileById(id);
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
});

ipcMain.handle('db:profiles:update', async (_event, id: number, updates: Record<string, unknown>) => {
    try {
        return await appDb!.profiles.updateProfile(id, updates);
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
});

ipcMain.handle('db:profiles:delete', async (_event, id: number) => {
    try {
        await appDb!.profiles.deleteProfile(id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting profile:', error);
        throw error;
    }
});

// ==================== CHECK TEMPLATE IPC HANDLERS ====================

ipcMain.handle('db:templates:list', async (_event, profileId: number) => {
    try {
        return await appDb!.templates.getTemplatesByProfileId(profileId);
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:create', async (_event, profileId: number, templateName: string, width: number, height: number, bankName: string, routingNumber: string, accountNumber: string) => {
    try {
        return await appDb!.templates.createCheckTemplate(profileId, templateName, width, height, bankName, routingNumber, accountNumber);
    } catch (error) {
        console.error('Error creating template:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:get', async (_event, id: number) => {
    try {
        return await appDb!.templates.getTemplateById(id);
    } catch (error) {
        console.error('Error fetching template:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:update', async (_event, id: number, updates: Record<string, unknown>) => {
    try {
        return await appDb!.templates.updateCheckTemplate(id, updates);
    } catch (error) {
        console.error('Error updating template:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:delete', async (_event, id: number) => {
    try {
        await appDb!.templates.deleteCheckTemplate(id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
});

ipcMain.handle('dialog:pickImageFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Cheque Image',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    try {
        const filePath = result.filePaths[0];
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).replace('.', '') || 'png';
        const mime = getImageMimeTypeFromExtension(ext);
        return {
            filePath,
            dataUrl: `data:${mime};base64,${data.toString('base64')}`,
        };
    } catch (error) {
        console.error('Error preparing picked image preview:', error);
        return null;
    }
});

ipcMain.handle('db:templates:saveCheckImage', async (_event, templateId: number, profileId: number, sourcePath: string, ext: string) => {
    try {
        const metaDir = path.join(getMetaRoot(), String(profileId), String(templateId));
        await fs.promises.mkdir(metaDir, { recursive: true });

        // Ensure only one check image exists so extension changes do not leave stale files.
        const existingEntries = await fs.promises.readdir(metaDir).catch(() => [] as string[]);
        const oldImageFiles = existingEntries.filter((name) => name.startsWith('check_image.'));
        await Promise.all(
            oldImageFiles.map(async (name) => {
                const oldPath = path.join(metaDir, name);
                await fs.promises.unlink(oldPath).catch(() => undefined);
            }),
        );

        const destPath = path.join(metaDir, `check_image.${ext}`);
        await fs.promises.copyFile(sourcePath, destPath);
        return await appDb!.templates.updateCheckTemplate(templateId, { has_check_meta: true });
    } catch (error) {
        console.error('Error saving check image:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:getCheckImageDataUrl', async (_event, templateId: number, profileId: number) => {
    try {
        const metaDir = path.join(getMetaRoot(), String(profileId), String(templateId));
        const entries = await fs.promises.readdir(metaDir).catch(() => []);
        const imageFile = entries.find((f) => f.startsWith('check_image.'));
        if (!imageFile) return null;
        const filePath = path.join(metaDir, imageFile);
        const data = await fs.promises.readFile(filePath);
        const ext = imageFile.split('.').pop() ?? 'png';
        const mime = getImageMimeTypeFromExtension(ext);
        return `data:${mime};base64,${data.toString('base64')}`;
    } catch (error) {
        console.error('Error reading check image:', error);
        return null;
    }
});

ipcMain.handle('db:templates:saveCheckMeta', async (_event, templateId: number, profileId: number, savePath: string, fieldData: unknown) => {
    try {
        const metaDir = path.join(getMetaRoot(), String(profileId), String(templateId));
        await fs.promises.mkdir(metaDir, { recursive: true });
        const safeFileName = path.basename(savePath || 'check_meta.json');
        const destPath = path.join(metaDir, safeFileName);
        await fs.promises.writeFile(destPath, JSON.stringify(fieldData ?? [], null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error saving check meta:', error);
        throw error;
    }
});

ipcMain.handle('db:templates:getCheckMeta', async (_event, templateId: number, profileId: number, savePath: string) => {
    try {
        const metaDir = path.join(getMetaRoot(), String(profileId), String(templateId));
        const safeFileName = path.basename(savePath || 'check_meta.json');
        const metaPath = path.join(metaDir, safeFileName);
        const raw = await fs.promises.readFile(metaPath, 'utf8').catch(() => null);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.error('Error reading check meta:', error);
        return null;
    }
});

// ==================== CHECK IPC HANDLERS ====================

ipcMain.handle('db:checks:list', async (_event, templateId: number) => {
    try {
        return await appDb!.checks.getChecksByTemplateId(templateId);
    } catch (error) {
        console.error('Error fetching checks:', error);
        throw error;
    }
});

ipcMain.handle('db:checks:listByProfile', async (_event, profileId: number) => {
    try {
        return await appDb!.checks.getChecksByProfileId(profileId);
    } catch (error) {
        console.error('Error fetching checks by profile:', error);
        throw error;
    }
});

ipcMain.handle('db:checks:create', async (_event, templateId: number, checkNumber: string, payTo: string, amount: number, memo: string, date: string) => {
    try {
        return await appDb!.checks.createCheck(templateId, checkNumber, payTo, amount, memo, date);
    } catch (error) {
        console.error('Error creating check:', error);
        throw error;
    }
});

ipcMain.handle('db:checks:get', async (_event, id: number) => {
    try {
        return await appDb!.checks.getCheckById(id);
    } catch (error) {
        console.error('Error fetching check:', error);
        throw error;
    }
});

ipcMain.handle('db:checks:update', async (_event, id: number, updates: Record<string, unknown>) => {
    try {
        return await appDb!.checks.updateCheck(id, updates);
    } catch (error) {
        console.error('Error updating check:', error);
        throw error;
    }
});

ipcMain.handle('db:checks:delete', async (_event, id: number) => {
    try {
        await appDb!.checks.deleteCheck(id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting check:', error);
        throw error;
    }
});
