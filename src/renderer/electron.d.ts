// Type definitions for Electron API exposed via preload
export interface ElectronAPI {
    closeWindow: () => void;
    toggleLockState: () => void;
    onLockStateChanged: (callback: (isLocked: boolean) => void) => void;
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
    getWindowPosition: () => Promise<{ x: number; y: number }>;
    setWindowPosition: (x: number, y: number) => void;
    resizeWindowToContent: (width: number, height: number) => void;
    openGroupWindow: () => void;
    openHistoryWindow: () => void;
    onWindowShown: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
