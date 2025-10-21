/**
 * API communication layer
 *
 * This module provides centralized API calls to the backend server.
 * All functions include proper error handling and type safety.
 */

import type {
    ApiResponse,
    PlayerData,
    Settings,
    ManualGroupState,
    PlayerRegistry,
} from "../types";

const isDevelopment = process.env.NODE_ENV === "development";

function logError(context: string, error: unknown): void {
    if (isDevelopment) {
        console.error(`[API Error - ${context}]:`, error);
    }
}

export async function fetchPlayerData(): Promise<PlayerData[]> {
    try {
        const response = await fetch("/api/data");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<PlayerData[]> = await response.json();

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("fetchPlayerData", `Invalid response code: ${result.code}`);
        return [];
    } catch (error) {
        logError("fetchPlayerData", error);
        return [];
    }
}

export async function fetchSettings(): Promise<Settings> {
    try {
        const response = await fetch("/api/settings");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<Settings> = await response.json();

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("fetchSettings", `Invalid response code: ${result.code}`);
        return {};
    } catch (error) {
        logError("fetchSettings", error);
        return {};
    }
}

export async function resetStatistics(): Promise<boolean> {
    try {
        const response = await fetch("/api/reset");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        logError("resetStatistics", error);
        return false;
    }
}

export async function changeLanguage(language: string): Promise<boolean> {
    if (!language || typeof language !== "string") {
        logError("changeLanguage", "Invalid language parameter");
        return false;
    }

    try {
        const response = await fetch("/api/language", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ language }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return true;
    } catch (error) {
        logError("changeLanguage", error);
        return false;
    }
}

export async function getManualGroup(): Promise<ManualGroupState | null> {
    try {
        const response = await fetch("/api/manual-group");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<ManualGroupState> = await response.json();

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("getManualGroup", `Invalid response code: ${result.code}`);
        return null;
    } catch (error) {
        logError("getManualGroup", error);
        return null;
    }
}

export async function updateManualGroup(
    groupState: ManualGroupState,
): Promise<boolean> {
    if (
        !groupState ||
        typeof groupState.enabled !== "boolean" ||
        !Array.isArray(groupState.members)
    ) {
        logError("updateManualGroup", "Invalid groupState parameter");
        return false;
    }

    try {
        const response = await fetch("/api/manual-group", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(groupState),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        logError("updateManualGroup", error);
        return false;
    }
}

export async function clearManualGroup(): Promise<boolean> {
    try {
        const response = await fetch("/api/manual-group/clear", {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        logError("clearManualGroup", error);
        return false;
    }
}

export async function getPlayerRegistry(): Promise<PlayerRegistry> {
    try {
        const response = await fetch("/api/player-registry");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<PlayerRegistry> = await response.json();

        if (result.code === 0 && result.data) {
            return result.data;
        }

        logError("getPlayerRegistry", `Invalid response code: ${result.code}`);
        return {};
    } catch (error) {
        logError("getPlayerRegistry", error);
        return {};
    }
}

export async function addToPlayerRegistry(
    uuid: string,
    name: string,
): Promise<boolean> {
    if (
        !uuid ||
        !name ||
        typeof uuid !== "string" ||
        typeof name !== "string"
    ) {
        logError("addToPlayerRegistry", "Invalid uuid or name parameter");
        return false;
    }

    try {
        const response = await fetch("/api/player-registry", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uuid, name }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        logError("addToPlayerRegistry", error);
        return false;
    }
}
