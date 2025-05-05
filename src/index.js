const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const electronIpcMain = require('electron').ipcMain;
const path = require('node:path');

const fs = require('fs');
const fsPromises = fs.promises;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow; // Объявляем переменную mainWindow в глобальной области видимости

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.filePaths;
});

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools (optional)
  // mainWindow.webContents.openDevTools();

  return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  mainWindow = createWindow();

  // Обработчики управления окном должны быть объявлены после создания окна
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:toggle-maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow.close());

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function getDataPath() {
  return path.join(app.getPath('userData'), 'playerData.json');
}

function getBackupPath() {
  return path.join(app.getPath('userData'), 'playerData.backup.json');
}

async function safeSave(dataPath, data) {
  try {
    const tempPath = dataPath + '.tmp';
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2));
    
    try {
      if (fs.existsSync(dataPath)) {
        await fsPromises.copyFile(dataPath, getBackupPath());
      }
    } catch (backupError) {
      console.error('Backup failed:', backupError);
    }
    
    await fsPromises.rename(tempPath, dataPath);
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
}

ipcMain.handle('save-player-data', async (_, data) => {
  await safeSave(getDataPath(), data);
});

ipcMain.handle('load-player-data', async () => {
  try {
    const dataPath = getDataPath();
    
    try {
      const data = await fsPromises.readFile(dataPath, 'utf8');
      return JSON.parse(data);
    } catch (mainError) {
      console.log('Main data load failed, trying backup...');
      
      const backupData = await fsPromises.readFile(getBackupPath(), 'utf8');
      await safeSave(dataPath, JSON.parse(backupData));
      return JSON.parse(backupData);
    }
  } catch (error) {
    console.log('Both main and backup load failed, returning defaults');
    return {
      playlists: { 'Моя музыка': [] },
      currentPlaylist: 'Моя музыка',
      currentTrackIndex: -1,
      volume: 50
    };
  }
});