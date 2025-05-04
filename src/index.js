const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');

const fs = require('fs')
const fsPromises = fs.promises

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePaths
})

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
   
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


function getDataPath() {
  return path.join(app.getPath('userData'), 'playerData.json')
}


function getBackupPath() {
  return path.join(app.getPath('userData'), 'playerData.backup.json')
}


async function safeSave(dataPath, data) {
  try {
    const tempPath = dataPath + '.tmp'
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2))
    
   
    try {
      if (fs.existsSync(dataPath)) {
        await fsPromises.copyFile(dataPath, getBackupPath())
      }
    } catch (backupError) {
      console.error('Backup failed:', backupError)
    }
    
  
    await fsPromises.rename(tempPath, dataPath)
  } catch (error) {
    console.error('Save failed:', error)
    throw error
  }
}

ipcMain.handle('save-player-data', async (_, data) => {
  await safeSave(getDataPath(), data)
})

ipcMain.handle('load-player-data', async () => {
  try {
    const dataPath = getDataPath()
    
   
    try {
      const data = await fsPromises.readFile(dataPath, 'utf8')
      return JSON.parse(data)
    } catch (mainError) {
      console.log('Main data load failed, trying backup...')
      
    
      const backupData = await fsPromises.readFile(getBackupPath(), 'utf8')
      await safeSave(dataPath, JSON.parse(backupData)) // Восстанавливаем из бэкапа
      return JSON.parse(backupData)
    }
  } catch (error) {
    console.log('Both main and backup load failed, returning defaults')
    return {
      playlists: { 'Моя музыка': [] },
      currentPlaylist: 'Моя музыка',
      currentTrackIndex: -1,
      volume: 50
    }
  }
})