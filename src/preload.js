// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  savePlayerData: (data) => ipcRenderer.invoke('save-player-data', data),
  loadPlayerData: () => ipcRenderer.invoke('load-player-data'),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.send('window:close')

  
});
