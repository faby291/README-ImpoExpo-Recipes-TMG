const os = require('os');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');
const Toastify = require('toastify-js');

contextBridge.exposeInMainWorld('os', {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld('path', {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

contextBridge.exposeInMainWorld('Toastify', {
  toast: (options) => Toastify(options).showToast(),
});

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateCounter: (callback) => ipcRenderer.on('update-counter', (_event, value) => callback(value)),
  counterValue: (value) => ipcRenderer.send('counter-value', value)
});
