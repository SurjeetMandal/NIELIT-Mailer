import { contextBridge, ipcRenderer } from 'electron'

// Expose the IPC methods to the renderer process under the 'window.api' namespace.
contextBridge.exposeInMainWorld('api', {
  // Allows the renderer to call the 'open-dialog' handler in the Main Process
  openDialog: (options) => ipcRenderer.invoke('open-dialog', options),

  // Allows the renderer to call the 'distribute-files' handler in the Main Process
  distributeFiles: (payload) => ipcRenderer.invoke('distribute-files', payload)
})
