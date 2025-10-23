import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
    closeWindow: () => ipcRenderer.send("close-window"),
    toggleLockState: () => ipcRenderer.send("toggle-lock-state"),
    onLockStateChanged: (callback: (isLocked: boolean) => void) =>
        ipcRenderer.on(
            "lock-state-changed",
            (_event: IpcRendererEvent, isLocked: boolean) => callback(isLocked),
        ),
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => ipcRenderer.send("set-ignore-mouse-events", ignore, options),
    getWindowPosition: () => ipcRenderer.invoke("get-window-position"),
    setWindowPosition: (x: number, y: number) => ipcRenderer.send("set-window-position", x, y),
    resizeWindowToContent: (
        windowType: string,
        width: number,
        height: number,
    ) => ipcRenderer.send("resize-window-to-content", windowType, width, height),
    openGroupWindow: () => ipcRenderer.send("open-group-window"),
    openHistoryWindow: () => ipcRenderer.send("open-history-window"),
    openDeviceWindow: () => ipcRenderer.send("open-device-window"),
    onWindowShown: (callback: () => void) => ipcRenderer.on("window-shown", () => callback()),
    saveWindowSize: (
        windowType: string,
        width: number,
        height: number,
        scale?: number,
    ) => ipcRenderer.send("save-window-size", windowType, width, height, scale),
    getSavedWindowSizes: () => ipcRenderer.invoke("get-saved-window-sizes"),
});

window.addEventListener("DOMContentLoaded", () => {
    const replaceText = (selector: string, text: string) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    };

    for (const type of ["chrome", "node", "electron"] as const) {
        replaceText(`${type}-version`, process.versions[type] || "unknown");
    }
});
