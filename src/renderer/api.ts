/**
 * API communication layer
 */

import type {
    ApiResponse,
    PlayerData,
    Settings,
    ManualGroupState,
    PlayerRegistry
} from './types';

export async function fetchPlayerData(): Promise<PlayerData[]> {
    try {
        const response = await fetch('/api/data');
        const result: ApiResponse<PlayerData[]> = await response.json();
        
        if (result.code === 0 && result.data) {
            return result.data;
        }
        
        console.error('Failed to fetch player data:', result);
        return [];
    } catch (error) {
        console.error('Error fetching player data:', error);
        return [];
    }
}

export async function fetchSettings(): Promise<Settings> {
    try {
        const response = await fetch('/api/settings');
        const result: ApiResponse<Settings> = await response.json();
        
        if (result.code === 0 && result.data) {
            return result.data;
        }
        
        return {};
    } catch (error) {
        console.error('Error fetching settings:', error);
        return {};
    }
}

export async function resetStatistics(): Promise<boolean> {
    try {
        const response = await fetch('/api/reset');
        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        console.error('Error resetting statistics:', error);
        return false;
    }
}

export async function changeLanguage(language: string): Promise<boolean> {
    try {
        const response = await fetch('/api/language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ language })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error changing language:', error);
        return false;
    }
}

export async function getManualGroup(): Promise<ManualGroupState | null> {
    try {
        const response = await fetch('/api/manual-group');
        const result: ApiResponse<ManualGroupState> = await response.json();
        
        if (result.code === 0 && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching manual group:', error);
        return null;
    }
}

export async function updateManualGroup(groupState: ManualGroupState): Promise<boolean> {
    try {
        const response = await fetch('/api/manual-group', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(groupState)
        });
        
        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        console.error('Error updating manual group:', error);
        return false;
    }
}

export async function clearManualGroup(): Promise<boolean> {
    try {
        const response = await fetch('/api/manual-group/clear', {
            method: 'POST'
        });
        
        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        console.error('Error clearing manual group:', error);
        return false;
    }
}

export async function getPlayerRegistry(): Promise<PlayerRegistry> {
    try {
        const response = await fetch('/api/player-registry');
        const result: ApiResponse<PlayerRegistry> = await response.json();
        
        if (result.code === 0 && result.data) {
            return result.data;
        }
        
        return {};
    } catch (error) {
        console.error('Error fetching player registry:', error);
        return {};
    }
}

export async function addToPlayerRegistry(uuid: string, name: string): Promise<boolean> {
    try {
        const response = await fetch('/api/player-registry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uuid, name })
        });
        
        const result: ApiResponse = await response.json();
        return result.code === 0;
    } catch (error) {
        console.error('Error adding to player registry:', error);
        return false;
    }
}
