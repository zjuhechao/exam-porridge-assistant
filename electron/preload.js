const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的 API
// 初期保持最小化，后续可按需添加原生功能
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,
  isElectron: true,

  // 窗口控制 (备用)
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
