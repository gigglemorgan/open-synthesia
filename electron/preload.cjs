const { contextBridge } = require('electron');

// Expose safe desktop environment info to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
});
