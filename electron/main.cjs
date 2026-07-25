const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.autoDownload = false; // User can choose to download or auto-download
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'QR Label Pro',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Remove default menu bar for clean app look
  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Check for updates shortly after app loads if in production
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
          console.error('Failed to check for updates on startup:', err);
        });
      }, 3000);
    }
  });
}

// IPC Handlers for Auto Update
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.on('check-for-update', () => {
  if (process.env.NODE_ENV === 'development') {
    // In dev mode, send mock event or actual check
    mainWindow?.webContents.send('update-not-available', {
      version: app.getVersion(),
      releaseNotes: 'Bạn đang chạy ứng dụng ở chế độ thử nghiệm (Development).',
    });
    return;
  }
  autoUpdater.checkForUpdates().catch((err) => {
    mainWindow?.webContents.send('update-error', err.message || 'Lỗi kiểm tra cập nhật');
  });
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    mainWindow?.webContents.send('update-error', err.message || 'Lỗi tải bản cập nhật');
  });
});

ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// AutoUpdater events forwarding to renderer process
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes || 'Phiên bản mới với nhiều cải tiến và sửa lỗi.',
  });
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents.send('update-not-available', {
    version: info.version,
  });
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err.message || 'Đã xảy ra lỗi khi cập nhật');
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('download-progress', {
    percent: Math.round(progressObj.percent),
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', {
    version: info.version,
    releaseNotes: info.releaseNotes,
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
