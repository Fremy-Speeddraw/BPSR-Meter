// Type definitions for Electron API exposed via preload
export interface ElectronAPI {
    closeWindow: () => void;
    toggleLockState: () => void;
    onLockStateChanged: (callback: (isLocked: boolean) => void) => void;
    setIgnoreMouseEvents: (
        ignore: boolean,
        options?: { forward: boolean },
    ) => void;
    getWindowPosition: () => Promise<{ x: number; y: number }>;
    setWindowPosition: (x: number, y: number) => void;
    resizeWindowToContent: (
        windowType: "main" | "group" | "history" | "device" | "settings" | "monsters",
        width: number,
        height: number,
        scale: number,
    ) => void;
    openGroupWindow: () => void;
    openMonstersWindow: () => void;
    openHistoryWindow: () => void;
    openSettingsWindow: () => void;
    onWindowShown: (callback: () => void) => void;
    saveWindowSize: (
        windowType: "main" | "group" | "history" | "device" | "settings" | "monsters",
        width: number,
        height: number,
        scale?: number,
    ) => void;
    getSavedWindowSizes: () => Promise<{
        main?: { width: number; height: number; scale?: number };
        group?: { width: number; height: number; scale?: number };
        history?: { width: number; height: number; scale?: number };
        device?: { width: number; height: number; scale?: number };
        settings?: { width: number; height: number; scale?: number };
        monsters?: { width: number; height: number; scale?: number };
    }>;
    updateVisibleColumns?: (cols: Record<string, boolean>) => void;
    onVisibleColumnsChanged?: (callback: (cols: Record<string, boolean>) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export {};
