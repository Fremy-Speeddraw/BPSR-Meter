import './electron.d.ts';
import { getProfessionInfo } from './professions';
import type { ManualGroupState, PlayerData, PlayerRegistry } from './types';
import { devLog, devWarn } from '../utils/logger';

// State
let manualGroupState: ManualGroupState = {
    enabled: false,
    members: []
};

let playerRegistry: PlayerRegistry = {};
let availablePlayers: PlayerData[] = [];

// DOM Elements
let groupEnabledToggle: HTMLInputElement | null = null;
let groupMemberCount: HTMLElement | null = null;
let groupMembersList: HTMLElement | null = null;
let availablePlayersList: HTMLElement | null = null;
let clearGroupBtn: HTMLElement | null = null;
let registryList: HTMLElement | null = null;
let registryUidInput: HTMLInputElement | null = null;
let registryNameInput: HTMLInputElement | null = null;
let registrySaveBtn: HTMLElement | null = null;
let globalScaleWidth: number = 0;
let globalScaleHeight: number = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    devLog('Group management window loaded');

    // Load saved window size and scale
    if (window.electronAPI) {
        try {
            const savedSizes = await window.electronAPI.getSavedWindowSizes();
            if (savedSizes && savedSizes.group && savedSizes.group.scale) {
                const scale = savedSizes.group.scale;
                document.documentElement.style.setProperty('--scale', scale.toString());
                devLog(`Loaded saved group window scale: ${scale}`);
            }
        } catch (error) {
            devWarn('Failed to load saved group window scale:', error);
        }
    }

    initializeDOMElements();
    setupEventListeners();
    setupDragging();
    setupZoomControls();

    // Load initial data
    loadGroupState();
    loadPlayerRegistry();
    startDataRefreshLoop();
});

function initializeDOMElements(): void {
    groupEnabledToggle = document.getElementById('group-enabled-toggle') as HTMLInputElement;
    groupMemberCount = document.getElementById('group-member-count');
    groupMembersList = document.getElementById('group-members-list');
    availablePlayersList = document.getElementById('available-players-list');
    clearGroupBtn = document.getElementById('clear-group-btn');
    registryList = document.getElementById('registry-list');
    registryUidInput = document.getElementById('registry-uid-input') as HTMLInputElement;
    registryNameInput = document.getElementById('registry-name-input') as HTMLInputElement;
    registrySaveBtn = document.getElementById('registry-save-btn');
}

function setupEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('group-close-button');
    if (closeBtn && window.electronAPI) {
        closeBtn.addEventListener('click', () => {
            window.close();
        });
    }

    // Group enabled toggle
    if (groupEnabledToggle) {
        groupEnabledToggle.addEventListener('change', handleGroupToggle);
    }

    // Clear group button
    if (clearGroupBtn) {
        clearGroupBtn.addEventListener('click', handleClearGroup);
    }

    // Registry save button
    if (registrySaveBtn) {
        registrySaveBtn.addEventListener('click', handleRegistrySave);
    }
}

function setupDragging(): void {
    const dragIndicator = document.getElementById('group-drag-indicator');
    if (!dragIndicator || !window.electronAPI) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    dragIndicator.addEventListener('mousedown', async (e: MouseEvent) => {
        isDragging = true;
        startX = e.screenX;
        startY = e.screenY;

        // Get current window position
        const pos = await window.electronAPI.getWindowPosition();
        const startPosX = pos.x;
        const startPosY = pos.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = moveEvent.screenX - startX;
            const deltaY = moveEvent.screenY - startY;

            window.electronAPI.setWindowPosition(
                startPosX + deltaX,
                startPosY + deltaY
            );
        };

        const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

function setupZoomControls(): void {
    if (!window.electronAPI) return;

    const zoomOutBtn = document.getElementById('group-zoom-out-btn');
    const zoomInBtn = document.getElementById('group-zoom-in-btn');

    if (!zoomOutBtn || !zoomInBtn) {
        devWarn('Group zoom buttons not found in DOM');
        return;
    }

    // Handle zoom out
    zoomOutBtn.addEventListener('click', () => {
        const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--scale') || '1');
        const newScale = Math.max(0.6, currentScale - 0.1);
        applyGroupScale(newScale);
    });

    // Handle zoom in
    zoomInBtn.addEventListener('click', () => {
        const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--scale') || '1');
        const newScale = Math.min(1.8, currentScale + 0.1);
        applyGroupScale(newScale);
    });
}

function applyGroupScale(scale: number): void {
    // Set the CSS scale variable
    document.documentElement.style.setProperty('--scale', scale.toString());

    if (window.electronAPI) {
        // Base dimensions at scale 1.0
        const baseWidth = 480;
        const baseHeight = 530;

        // Calculate scaled dimensions
        const scaledWidth = Math.floor(baseWidth * scale);
        const scaledHeight = Math.floor(baseHeight * scale);

        // Resize window
        window.electronAPI.resizeWindowToContent('group', scaledWidth, scaledHeight);

        // Save the settings
        setTimeout(() => {
            window.electronAPI.saveWindowSize('group', scaledWidth, scaledHeight, scale);
        }, 100);
    }
}

// API Functions
async function loadGroupState(): Promise<void> {
    try {
        const response = await fetch('/api/manual-group');
        const result = await response.json();

        if (result.code === 0 && result.data) {
            manualGroupState = result.data;
            updateGroupUI();
        }
    } catch (error) {
        console.error('Failed to load group state:', error);
    }
}

async function saveGroupState(): Promise<void> {
    try {
        const response = await fetch('/api/manual-group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(manualGroupState)
        });

        const result = await response.json();
        if (result.code === 0) {
            devLog('Group state saved');
        }
    } catch (error) {
        console.error('Failed to save group state:', error);
    }
}

async function loadPlayerRegistry(): Promise<void> {
    try {
        const response = await fetch('/api/player-registry');
        const result = await response.json();

        if (result.code === 0 && result.data) {
            playerRegistry = result.data;
            renderPlayerRegistry();
        }
    } catch (error) {
        console.error('Failed to load player registry:', error);
    }
}

async function savePlayerToRegistry(uid: string, name: string): Promise<void> {
    try {
        const response = await fetch('/api/player-registry/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, name })
        });

        const result = await response.json();
        if (result.code === 0 && result.data) {
            playerRegistry = result.data;
            renderPlayerRegistry();
            devLog(`Saved player: ${uid} -> ${name}`);

            // Clear inputs
            if (registryUidInput) registryUidInput.value = '';
            if (registryNameInput) registryNameInput.value = '';
        }
    } catch (error) {
        console.error('Failed to save player:', error);
    }
}

async function deletePlayerFromRegistry(uid: string): Promise<void> {
    try {
        const response = await fetch('/api/player-registry/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid })
        });

        const result = await response.json();
        if (result.code === 0 && result.data) {
            playerRegistry = result.data;
            renderPlayerRegistry();
            devLog(`Deleted player: ${uid}`);
        }
    } catch (error) {
        console.error('Failed to delete player:', error);
    }
}

async function fetchAvailablePlayers(): Promise<void> {
    try {
        const response = await fetch('/api/data');
        const result = await response.json();

        devLog('Fetched available players data:', result);

        if (result.code === 0 && result.user) {
            // Convert user object to array with uuid
            availablePlayers = Object.entries(result.user).map(([uid, userData]: [string, any]) => {
                // Check playerRegistry for name if userData.name is missing or Unknown
                const userName = (userData.name && userData.name !== 'Unknown' && userData.name.trim() !== '')
                    ? userData.name
                    : playerRegistry[uid]?.name || 'Unknown';

                return {
                    ...userData,
                    uuid: uid,
                    name: userName,
                    profession: userData.profession || 'Unknown',
                    currentHp: userData.hp || 0,
                    maxHp: userData.max_hp || 0,
                    totalDmg: userData.total_damage?.total || 0,
                    totalDmgTaken: userData.taken_damage || 0,
                    totalHeal: userData.total_healing?.total || 0,
                    totalShield: userData.total_shield || 0,
                    realtimeDps: userData.total_dps || 0,
                    percentDmg: 0,
                    percentDmgTaken: 0,
                    percentHeal: 0,
                    critRate: 0
                };
            });

            renderAvailablePlayers();
        } else {
            devWarn('No user data received');
            availablePlayers = [];
            renderAvailablePlayers();
        }
    } catch (error) {
        console.error('Failed to fetch available players:', error);
        availablePlayers = [];
        renderAvailablePlayers();
    }
}

// Event Handlers
function handleGroupToggle(): void {
    if (!groupEnabledToggle) return;

    manualGroupState.enabled = groupEnabledToggle.checked;
    saveGroupState();

    devLog('Group filter:', manualGroupState.enabled ? 'ENABLED' : 'DISABLED');
}

function handleClearGroup(): void {
    if (confirm('Are you sure you want to remove all group members?')) {
        manualGroupState.members = [];
        saveGroupState();
        updateGroupUI();
    }
}

function handleRegistrySave(): void {
    if (!registryUidInput || !registryNameInput) return;

    const uid = registryUidInput.value.trim();
    const name = registryNameInput.value.trim();

    if (!uid || !name) {
        alert('Please enter both UID and Name');
        return;
    }

    savePlayerToRegistry(uid, name);
}

function handleAddToGroup(playerUuid: string): void {
    if (!manualGroupState.members.includes(playerUuid)) {
        manualGroupState.members.push(playerUuid);
        saveGroupState();
        updateGroupUI();
    }
}

function handleRemoveFromGroup(playerUuid: string): void {
    manualGroupState.members = manualGroupState.members.filter(uuid => uuid !== playerUuid);
    saveGroupState();
    updateGroupUI();
}

// Rendering Functions
function updateGroupUI(): void {
    // Update toggle state
    if (groupEnabledToggle) {
        groupEnabledToggle.checked = manualGroupState.enabled;
    }

    // Update member count
    if (groupMemberCount) {
        groupMemberCount.textContent = manualGroupState.members.length.toString();
    }

    // Render group members
    renderGroupMembers();
}

function renderGroupMembers(): void {
    if (!groupMembersList) return;

    if (manualGroupState.members.length === 0) {
        groupMembersList.innerHTML = '<div class="empty-state">No members in group</div>';
        return;
    }

    groupMembersList.innerHTML = '';

    manualGroupState.members.forEach(uuid => {
        const player = availablePlayers.find(p => p.uuid === uuid);
        const memberItem = createGroupMemberElement(uuid, player);
        groupMembersList.appendChild(memberItem);
    });
}

function createGroupMemberElement(uuid: string, player?: PlayerData): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'group-member-item';

    const name = player?.name || playerRegistry[uuid]?.name || 'Unknown';
    const profession = player?.profession || 'Unknown';

    // Get profession info - prefer sub-profession for icon if available
    const professionParts = profession.split('-');
    const mainProfessionKey = professionParts[0];
    const subProfessionKey = professionParts[1];
    const profInfo = subProfessionKey
        ? getProfessionInfo(subProfessionKey)
        : getProfessionInfo(mainProfessionKey);

    div.innerHTML = `
        <div class="player-info">
            <span class="player-name">${name}</span>
            <span class="player-uid">(${uuid.slice(0, 8)}...)</span>
            <span class="player-profession">${profInfo.name}</span>
        </div>
        <button class="btn-remove" data-uuid="${uuid}">Remove</button>
    `;

    const removeBtn = div.querySelector('.btn-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => handleRemoveFromGroup(uuid));
    }

    return div;
}

function renderAvailablePlayers(): void {
    if (!availablePlayersList) return;

    const nonGroupPlayers = availablePlayers.filter(
        p => p.uuid && !manualGroupState.members.includes(p.uuid)
    );

    if (nonGroupPlayers.length === 0) {
        availablePlayersList.innerHTML = '<div class="empty-state">No available players</div>';
        return;
    }

    availablePlayersList.innerHTML = '';

    nonGroupPlayers.forEach(player => {
        if (!player.uuid) return;

        const playerItem = createAvailablePlayerElement(player);
        availablePlayersList.appendChild(playerItem);
    });
}

function createAvailablePlayerElement(player: PlayerData): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'available-player-item';

    // Check playerRegistry for name if player.name is Unknown or missing
    const displayName = (player.name && player.name !== 'Unknown' && player.name.trim() !== '')
        ? player.name
        : (player.uuid && playerRegistry[player.uuid]?.name) || 'Unknown';

    // Get profession info - prefer sub-profession for icon if available
    const professionParts = (player.profession || 'Unknown').split('-');
    const mainProfessionKey = professionParts[0];
    const subProfessionKey = professionParts[1];
    const profInfo = subProfessionKey
        ? getProfessionInfo(subProfessionKey)
        : getProfessionInfo(mainProfessionKey);

    div.innerHTML = `
        <div class="player-info">
            <span class="player-name">${displayName}</span>
            <span class="player-uid">(${player.uuid?.slice(0, 8) || 'N/A'}...)</span>
            <span class="player-profession">${profInfo.name}</span>
        </div>
    `;

    div.addEventListener('click', () => {
        if (player.uuid) {
            handleAddToGroup(player.uuid);
        }
    });

    return div;
}

function renderPlayerRegistry(): void {
    if (!registryList) return;

    const entries = Object.entries(playerRegistry);

    if (entries.length === 0) {
        registryList.innerHTML = '<div class="empty-state">No saved players</div>';
        return;
    }

    registryList.innerHTML = '';

    entries.forEach(([uid, data]) => {
        const registryItem = createRegistryElement(uid, data.name);
        registryList.appendChild(registryItem);
    });
}

function createRegistryElement(uid: string, name: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'group-member-item';

    div.innerHTML = `
        <div class="player-info">
            <span class="player-name">${name}</span>
            <span class="player-uid">(${uid.slice(0, 8)}...)</span>
        </div>
        <button class="btn-remove" data-uid="${uid}">Delete</button>
    `;

    const deleteBtn = div.querySelector('.btn-remove');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePlayerFromRegistry(uid));
    }

    return div;
}

// Helper functions
let lastWindowWidth = 0;
let lastWindowHeight = 0;

function resizeWindowToContent(force: boolean = false): void {
    if (!window.electronAPI?.resizeWindowToContent) return;

    requestAnimationFrame(() => {
        const groupMeter = document.querySelector('.group-meter') as HTMLElement;
        if (groupMeter) {
            const rect = groupMeter.getBoundingClientRect();
            const width = Math.ceil(rect.width);
            const height = Math.ceil(rect.height);

            if (width < 100 || height < 50 || width > 2000 || height > 1500) {
                devWarn('Invalid dimensions detected:', width, height);
                return;
            }

            if (force) {
                window.electronAPI.resizeWindowToContent('group', width, height);
                lastWindowWidth = width;
                lastWindowHeight = height;
                globalScaleWidth = width;
                globalScaleHeight = height;
                devLog('Forced resize to:', width, height);
            } else {
                const widthChanged = Math.abs(width - lastWindowWidth) > 5;
                const heightChanged = Math.abs(height - lastWindowHeight) > 5;

                if (widthChanged || heightChanged) {
                    window.electronAPI.resizeWindowToContent('group', width, height);
                    lastWindowWidth = width;
                    lastWindowHeight = height;
                }
            }
        }
    });
}

// Data Refresh Loop
function startDataRefreshLoop(): void {
    // Initial load
    fetchAvailablePlayers();

    setInterval(() => {
        resizeWindowToContent(true);
    }, 100);

    // Refresh every 2 seconds
    setInterval(() => {
        fetchAvailablePlayers();
    }, 2000);
}

// Export for debugging
(window as any).groupState = {
    manualGroupState,
    playerRegistry,
    availablePlayers,
    refreshData: fetchAvailablePlayers
};
