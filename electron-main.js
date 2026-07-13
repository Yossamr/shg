
import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// --- SECURITY: HARDWARE LOCK (SINGLE MACHINE LICENSE) ---
function getMachineId() {
    try {
        const cpus = os.cpus();
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'generic-cpu';
        const hostname = os.hostname();
        const arch = os.arch();
        const platform = os.platform();
        const totalMem = Math.floor(os.totalmem() / 1024 / 1024 / 1024); // GB
        
        // Create a unique fingerprint based on hardware
        // This string will be different on another PC
        const hardwareString = `${hostname}|${cpuModel}|${arch}|${platform}|${totalMem}|GOLDMASTER_SECURE_V1`;
        
        return crypto.createHash('sha256').update(hardwareString).digest('hex').toUpperCase();
    } catch (e) {
        return "UNKNOWN-MACHINE-ID";
    }
}

function checkLicense() {
    const currentMachineId = getMachineId();
    // This file acts as the anchor. It sits next to the exe.
    // If the folder is copied, this file is copied too.
    // The ID inside it will match the OLD machine, but currentMachineId will be the NEW machine.
    // Result: Mismatch -> Block.
    const lockFileName = 'system_core.dat'; 
    let lockFilePath;

    if (app.isPackaged) {
        // Production: Inside the installation folder (next to .exe)
        lockFilePath = path.join(path.dirname(app.getPath('exe')), lockFileName);
    } else {
        // Development
        lockFilePath = path.join(__dirname, lockFileName);
    }

    try {
        if (fs.existsSync(lockFilePath)) {
            // File exists: Validate Identity
            const storedId = fs.readFileSync(lockFilePath, 'utf-8').trim();
            if (storedId === currentMachineId) {
                return true; // Valid: Running on the original machine
            } else {
                // Invalid: The folder was copied to a different machine
                dialog.showErrorBox(
                    "خطأ في الترخيص (Security Alert)", 
                    "لا يمكن تشغيل هذا البرنامج على هذا الجهاز.\n\n" +
                    "تم اكتشاف محاولة نقل أو نسخ البرنامج من جهاز آخر.\n" +
                    "هذا النظام مرخص للعمل على الجهاز الأصلي فقط."
                );
                return false;
            }
        } else {
            // First Run: Bind to this machine
            try {
                fs.writeFileSync(lockFilePath, currentMachineId);
                return true;
            } catch (err) {
                // Needs Admin rights to write to Program Files
                dialog.showErrorBox(
                    "تنبيه هام (First Run)",
                    "يرجى تشغيل البرنامج كمسؤول (Run as Administrator) لأول مرة فقط لتفعيل الترخيص."
                );
                return false;
            }
        }
    } catch (error) {
        dialog.showErrorBox("System Error", "فشل التحقق من هوية الجهاز.");
        return false;
    }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 768,
    title: "Gold Master Egypt - نظام إدارة محلات الذهب",
    icon: path.join(__dirname, 'public/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false 
    }
  });

  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Only start the app if license check passes
app.on('ready', () => {
    if (checkLicense()) {
        createWindow();
    } else {
        app.quit();
    }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    if (checkLicense()) {
        createWindow();
    }
  }
});
