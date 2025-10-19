import './electron.d.ts';
import { loadTranslations, t, translateSkill, translateProfession, getCurrentLanguage } from './translations';
import { fetchSettings, resetStatistics, changeLanguage, getManualGroup, getPlayerRegistry } from './api';
import { getProfessionInfo } from './professions';
import { formatStat, formatDPS } from './utils';
import type { PlayerData, ViewMode, SortColumn, SortDirection, ManualGroupState, PlayerRegistry } from './types';
import { devLog, devWarn } from '../utils/logger';

// Global state
let viewMode: ViewMode = 'nearby';
let sortColumn: SortColumn = 'totalDmg';
let sortDirection: SortDirection = 'desc';
let isLocked: boolean = false;
let isDraggingWindow: boolean = false;
let currentMouseEventsState: boolean = false;
let isScrolling: boolean = false;
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
let manualGroupState: ManualGroupState = { enabled: false, members: [] };
let playerRegistryCache: PlayerRegistry = {};

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    devLog('BPSR Meter TypeScript renderer loaded!');
    
    try {
        // Initialize translations
        const settings = await fetchSettings();
        const targetLang = settings.language || 'en';
        const translationLoaded = await loadTranslations(targetLang);
        
        if (!translationLoaded) {
            devWarn('Failed to load translations, falling back to English');
            await loadTranslations('en');
        }
        
        // Update UI with translations
        updateUITranslations();
    } catch (error) {
        console.error('Failed to initialize translations:', error);
        await loadTranslations('en');
        updateUITranslations();
    }
    
    // Load player registry
    await loadPlayerRegistryCache();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup Electron-specific features
    if (window.electronAPI) {
        setupElectronFeatures();
    }
    
    // Start data fetching loop
    startDataLoop();
});

function setupEventListeners(): void {
    // Close button
    const closeBtn = document.getElementById('close-button');
    if (closeBtn && window.electronAPI) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }
    
    // Lock button
    const lockBtn = document.getElementById('lock-button');
    if (lockBtn && window.electronAPI) {
        lockBtn.addEventListener('click', () => {
            window.electronAPI.toggleLockState();
        });
    }
    
    // Language toggle
    const languageBtn = document.getElementById('language-btn');
    if (languageBtn) {
        languageBtn.addEventListener('click', handleLanguageToggle);
    }
    
    // Sync/refresh button
    const syncBtn = document.getElementById('sync-button');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSync);
    }
    
    // Sort buttons
    setupSortButtons();
    
    // Group button
    const groupBtn = document.getElementById('group-btn');
    if (groupBtn && window.electronAPI) {
        groupBtn.addEventListener('click', () => {
            window.electronAPI.openGroupWindow();
            setTimeout(() => resizeWindowToContent(true), 100);
        });
    }
    
    // History button
    const historyBtn = document.getElementById('history-btn');
    devLog('History button element:', historyBtn);
    devLog('window.electronAPI:', window.electronAPI);
    devLog('openHistoryWindow method:', window.electronAPI?.openHistoryWindow);
    
    if (historyBtn && window.electronAPI) {
        historyBtn.addEventListener('click', () => {
            devLog('History button clicked, opening history window...');
            window.electronAPI.openHistoryWindow();
        });
        devLog('History button handler registered successfully');
    } else {
        devWarn('History button setup failed:', {
            hasButton: !!historyBtn,
            hasElectronAPI: !!window.electronAPI,
            hasMethod: !!window.electronAPI?.openHistoryWindow
        });
    }
    
    // Nearby/Solo/Skills button toggles
    const nearbyGroupBtn = document.getElementById('nearby-group-btn');
    if (nearbyGroupBtn) {
        nearbyGroupBtn.addEventListener('click', () => {
            viewMode = viewMode === 'nearby' ? 'solo' : 'nearby';
            nearbyGroupBtn.textContent = viewMode === 'nearby' ? 'Nearby' : 'Solo';
            nearbyGroupBtn.classList.toggle('solo', viewMode === 'solo');
            
            const sortButtons = [document.getElementById('sort-dmg-btn'), document.getElementById('sort-tank-btn'), document.getElementById('sort-heal-btn')];
            sortButtons.forEach(btn => {
                if (btn) {
                    (btn as HTMLElement).style.display = viewMode === 'solo' ? 'none' : 'block';
                }
            });
            
            fetchDataAndRender();
        });
    }
    
    const skillsBtn = document.getElementById('skills-btn');
    if (skillsBtn) {
        skillsBtn.addEventListener('click', () => {
            viewMode = viewMode === 'skills' ? 'nearby' : 'skills';
            skillsBtn.classList.toggle('active', viewMode === 'skills');
            
            const sortButtons = [document.getElementById('sort-dmg-btn'), document.getElementById('sort-tank-btn'), document.getElementById('sort-heal-btn')];
            sortButtons.forEach(btn => {
                if (btn) {
                    (btn as HTMLElement).style.display = viewMode === 'skills' ? 'none' : 'block';
                }
            });
            
            if (nearbyGroupBtn) {
                if (viewMode === 'skills') {
                    (nearbyGroupBtn as HTMLElement).style.display = 'none';
                } else {
                    (nearbyGroupBtn as HTMLElement).style.display = 'block';
                    nearbyGroupBtn.textContent = viewMode === 'nearby' ? 'Nearby' : 'Solo';
                }
            }
            
            fetchDataAndRender();
        });
    }
    
    // Window resize events
    window.addEventListener('focus', () => {
        setTimeout(() => resizeWindowToContent(true), 50);
    });
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => resizeWindowToContent(true), 50);
        }
    });
}

function setupElectronFeatures(): void {
    if (!window.electronAPI) return;
    
    // Lock state changes
    window.electronAPI.onLockStateChanged((locked: boolean) => {
        isLocked = locked;
        updateLockUI(locked);
        updateClickThroughState();
    });
    
    // Initialize with mouse events enabled
    window.electronAPI.setIgnoreMouseEvents(false);
    currentMouseEventsState = false;
    devLog('Initial state: Mouse events ENABLED (UI is interactive)');
    
    // Setup manual drag
    setupManualDrag();
    
    // Setup click-through control
    setupClickThroughControl();
    
    // Force resize multiple times at startup
    setTimeout(() => resizeWindowToContent(true), 100);
}

function setupManualDrag(): void {
    const dragIndicator = document.getElementById('drag-indicator');
    if (!dragIndicator || !window.electronAPI) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startWindowX = 0;
    let startWindowY = 0;

    dragIndicator.addEventListener('mousedown', async (e: MouseEvent) => {
        if (isLocked) return;

        isDragging = true;
        isDraggingWindow = true; // Prevent resize during drag
        startX = e.screenX;
        startY = e.screenY;

        const position = await window.electronAPI.getWindowPosition();
        startWindowX = position.x;
        startWindowY = position.y;

        enableMouseEvents();
        devLog('Drag started at:', startX, startY);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging || isLocked) return;

        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;
        const newX = startWindowX + deltaX;
        const newY = startWindowY + deltaY;

        window.electronAPI?.setWindowPosition(newX, newY);
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            devLog('Drag ended');
            setTimeout(() => {
                if (!isDragging) {
                    disableMouseEvents();
                    isDraggingWindow = false; // Re-enable resize
                }
            }, 100);
        }
    });
}

function enableMouseEvents(): void {
    if (window.electronAPI && currentMouseEventsState) {
        window.electronAPI.setIgnoreMouseEvents(false);
        currentMouseEventsState = false;
        devLog('Mouse events ENABLED');
    }
}

function disableMouseEvents(): void {
    if (isScrolling) {
        devLog('Mouse events NOT disabled (user is scrolling)');
        return;
    }
    
    if (window.electronAPI && !currentMouseEventsState) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
        currentMouseEventsState = true;
        devLog('Mouse events DISABLED (click-through)');
    }
}

function setupClickThroughControl(): void {
    if (!window.electronAPI) return;

    document.addEventListener('mouseover', (e: MouseEvent) => {
        let shouldEnableEvents = false;

        if (isLocked) {
            const essentialSelectors = ['.controls', '.control-button', '.sync-button', '.advanced-lite-btn', '#player-bars-container', '.skills-container', '.modal', '.add-to-registry-btn'];
            shouldEnableEvents = essentialSelectors.some(selector =>
                (e.target as Element).closest(selector) !== null
            );
        } else {
            const allSelectors = ['.controls', '.drag-indicator', '#player-bars-container', '.skills-container', '.modal', '.add-to-registry-btn'];
            shouldEnableEvents = allSelectors.some(selector =>
                (e.target as Element).closest(selector) !== null
            );
        }

        if (shouldEnableEvents) {
            enableMouseEvents();
        }
    });

    document.addEventListener('mouseout', (e: MouseEvent) => {
        setTimeout(() => {
            let shouldKeepEvents = false;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);

            if (elementUnderMouse) {
                if (isLocked) {
                    const essentialSelectors = ['.controls', '.control-button', '.sync-button', '.advanced-lite-btn', '#player-bars-container', '.skills-container', '.modal'];
                    shouldKeepEvents = essentialSelectors.some(selector =>
                        elementUnderMouse.closest(selector) !== null
                    );
                } else {
                    const allSelectors = ['.controls', '.drag-indicator', '#player-bars-container', '.skills-container', '.modal'];
                    shouldKeepEvents = allSelectors.some(selector =>
                        elementUnderMouse.closest(selector) !== null
                    );
                }
            }

            if (!shouldKeepEvents) {
                disableMouseEvents();
            }
        }, 50);
    });

    document.addEventListener('mouseleave', () => {
        disableMouseEvents();
    });

    document.addEventListener('wheel', (e: WheelEvent) => {
        const scrollableElement = (e.target as Element).closest('.skills-container, #player-bars-container');
        if (scrollableElement) {
            isScrolling = true;
            enableMouseEvents();
            
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                devLog('Scrolling ended');
            }, 150);
        }
    }, { passive: true });
}

function setupSortButtons(): void {
    const sortDmgBtn = document.getElementById('sort-dmg-btn');
    const sortTankBtn = document.getElementById('sort-tank-btn');
    const sortHealBtn = document.getElementById('sort-heal-btn');
    
    if (sortDmgBtn) {
        sortDmgBtn.addEventListener('click', () => setSortColumn('totalDmg'));
    }
    if (sortTankBtn) {
        sortTankBtn.addEventListener('click', () => setSortColumn('totalDmgTaken'));
    }
    if (sortHealBtn) {
        sortHealBtn.addEventListener('click', () => setSortColumn('totalHeal'));
    }
}

function setSortColumn(column: SortColumn): void {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }
    
    updateSortButtonsUI();
    fetchDataAndRender();
}

function updateSortButtonsUI(): void {
    const buttons = ['sort-dmg-btn', 'sort-tank-btn', 'sort-heal-btn'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('active');
        }
    });
    
    const activeBtn = document.getElementById(`sort-${sortColumn === 'totalDmg' ? 'dmg' : sortColumn === 'totalDmgTaken' ? 'tank' : 'heal'}-btn`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

async function handleLanguageToggle(): Promise<void> {
    const newLang = getCurrentLanguage() === 'en' ? 'zh' : 'en';
    
    try {
        const success = await changeLanguage(newLang);
        if (success) {
            await loadTranslations(newLang);
            updateUITranslations();
            await fetchDataAndRender();
        }
    } catch (error) {
        console.error('Failed to change language:', error);
    }
}

async function handleSync(): Promise<void> {
    const syncBtn = document.getElementById('sync-button');
    if (syncBtn) {
        syncBtn.style.opacity = '0.5';
        (syncBtn as HTMLElement).style.pointerEvents = 'none';
    }
    
    await resetStatistics();
    await fetchDataAndRender();
    
    if (syncBtn) {
        setTimeout(() => {
            syncBtn.style.opacity = '1';
            (syncBtn as HTMLElement).style.pointerEvents = 'auto';
        }, 300);
    }
}

function updateLockUI(locked: boolean): void {
    const lockBtn = document.getElementById('lock-button');
    if (lockBtn) {
        lockBtn.innerHTML = locked 
            ? '<i class="fa-solid fa-lock"></i>' 
            : '<i class="fa-solid fa-lock-open"></i>';
        lockBtn.title = locked ? 'Unlock position' : 'Lock position';
    }
    
    const dpsMeter = document.querySelector('.dps-meter');
    if (dpsMeter) {
        dpsMeter.classList.toggle('locked', locked);
    }
}

function updateClickThroughState(): void {
    if (!window.electronAPI) return;
    
    if (isLocked) {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
        currentMouseEventsState = true;
        devLog('Locked mode: click-through ENABLED');
    } else {
        window.electronAPI.setIgnoreMouseEvents(false);
        currentMouseEventsState = false;
        devLog('Unlocked mode: Mouse events ENABLED (fully interactive)');
    }
}

function updateUITranslations(): void {
    // Update UI elements with translated text
    // This would be a comprehensive function that updates all UI text
    devLog('UI translations updated');
    // TODO: Implement full translation updates
}

async function loadPlayerRegistryCache(): Promise<void> {
    playerRegistryCache = await getPlayerRegistry();
}

async function addPlayerToRegistry(uid: string, name: string): Promise<void> {
    try {
        const response = await fetch('/api/player-registry/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, name })
        });
        const result = await response.json();
        if (result.code === 0) {
            devLog(`Added player to registry: ${uid} -> ${name}`);
            const btn = document.querySelector(`.add-to-registry-btn[data-uid="${uid}"]`) as HTMLButtonElement;
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                btn.style.background = 'rgba(46, 204, 113, 0.3)';
                btn.style.borderColor = '#2ecc71';
                btn.style.color = '#2ecc71';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 1000);
            }
            await loadPlayerRegistryCache();
        }
    } catch (error) {
        console.error('Failed to add player to registry:', error);
    }
}

function startDataLoop(): void {
    fetchDataAndRender();
    setInterval(fetchDataAndRender, 50);
    
    // Refresh group state every 2 seconds
    setInterval(async () => {
        manualGroupState = await getManualGroup();
    }, 2000);
    
    // Refresh player registry every 10 seconds
    setInterval(loadPlayerRegistryCache, 10000);
}

let lastTotalDamage = 0;
let lastStartTime = 0;

async function fetchDataAndRender(): Promise<void> {
    const container = document.getElementById('player-bars-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const playerBarsContainer = document.getElementById('player-bars-container');
    
    if (!container) return;
    
    try {
        // Handle skills view mode
        if (viewMode === 'skills') {
            const [skillsRes, settingsRes] = await Promise.all([
                fetch('/api/skills'),
                fetch('/api/settings')
            ]);
            const skillsData = await skillsRes.json();

            if (skillsData.code === 0 && skillsData.data && skillsData.data.skills && Object.keys(skillsData.data.skills).length > 0) {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (playerBarsContainer) playerBarsContainer.style.display = 'block';
                renderSkillBreakdown(skillsData.data.skills, skillsData.startTime);
                resizeWindowToContent();
            } else {
                if (loadingIndicator) loadingIndicator.style.display = 'flex';
                if (playerBarsContainer) playerBarsContainer.style.display = 'none';
            }
            return;
        }

        // Use correct API based on view mode
        const apiEndpoint = viewMode === 'solo' ? '/api/solo-user' : '/api/data';
        const response = await fetch(apiEndpoint);
        const userData = await response.json();

        // Detect server reset
        if (userData.startTime && userData.startTime !== lastStartTime) {
            devLog('Server reset detected. Clearing local state.');
            lastStartTime = userData.startTime;
            lastTotalDamage = 0;
        }

        // Convert users object to array
        let userArray = Object.entries(userData.user).map(([uid, data]: [string, any]) => ({
            ...data,
            uid: parseInt(uid, 10)
        }));

        // Filter out players with no activity
        userArray = userArray.filter((u: any) =>
            (u.total_damage && u.total_damage.total > 0) ||
            (u.taken_damage > 0) ||
            (u.total_healing && u.total_healing.total > 0)
        );

        // Apply manual group filtering
        if (manualGroupState && manualGroupState.enabled && manualGroupState.members && manualGroupState.members.length > 0) {
            const groupUids = manualGroupState.members;
            userArray = userArray.filter((u: any) => groupUids.includes(String(u.uid)));
            devLog(`Manual group filter applied: ${userArray.length} players in group`);
        }

        if (!userArray || userArray.length === 0) {
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            if (playerBarsContainer) playerBarsContainer.style.display = 'none';
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (playerBarsContainer) playerBarsContainer.style.display = 'flex';

        const sumaTotalDamage = userArray.reduce((acc: number, u: any) => 
            acc + (u.total_damage && u.total_damage.total ? Number(u.total_damage.total) : 0), 0);

        if (sumaTotalDamage !== lastTotalDamage) {
            lastTotalDamage = sumaTotalDamage;
        }

        // Calculate damage percent
        userArray.forEach((u: any) => {
            const userDamage = u.total_damage && u.total_damage.total ? Number(u.total_damage.total) : 0;
            u.damagePercent = sumaTotalDamage > 0 ? Math.max(0, Math.min(100, (userDamage / sumaTotalDamage) * 100)) : 0;
        });

        // Get local user UID
        let localUid: number | null = null;
        if (viewMode === 'solo') {
            const uidKey = Object.keys(userData.user)[0];
            localUid = uidKey ? parseInt(uidKey, 10) : null;
        } else {
            try {
                const localUserResponse = await fetch('/api/solo-user');
                const localUserData = await localUserResponse.json();
                if (localUserData.user && Object.keys(localUserData.user).length > 0) {
                    localUid = parseInt(Object.keys(localUserData.user)[0], 10);
                }
            } catch (err) {
                devLog('Could not get local user:', err);
            }
        }

        // Sort users
        sortUserArray(userArray);

        // Handle top 10 + local user for nearby mode
        let localUserExtra: any = null;
        if (viewMode === 'nearby' && localUid) {
            const top10 = userArray.slice(0, 10);
            const isLocalInTop10 = top10.some((u: any) => u.uid === localUid);

            if (userArray.length > 10 && !isLocalInTop10) {
                localUserExtra = userArray.find((u: any) => u.uid === localUid);
            }

            if (userArray.length > 10) {
                userArray = top10;
            }
        }

        if (localUserExtra) {
            userArray.push(localUserExtra);
        }

        renderPlayerBars(container, userArray, localUid);
        resizeWindowToContent();

    } catch (err) {
        console.error('Error in fetchDataAndRender:', err);
        if (container) {
            container.innerHTML = `<div id="message-display">${t('ui.messages.waitingForData')}</div>`;
        }
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (playerBarsContainer) playerBarsContainer.style.display = 'none';
    }
}

function sortUserArray(userArray: any[]): void {
    userArray.sort((a, b) => {
        let aVal, bVal;

        switch (sortColumn) {
            case 'totalDmg':
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
                break;
            case 'totalDmgTaken':
                aVal = Number(a.taken_damage) || 0;
                bVal = Number(b.taken_damage) || 0;
                break;
            case 'totalHeal':
                aVal = a.total_healing?.total ? Number(a.total_healing.total) : 0;
                bVal = b.total_healing?.total ? Number(b.total_healing.total) : 0;
                break;
            default:
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
        }

        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
}

function renderPlayers(players: PlayerData[]): void {
    // Sort players
    const sorted = sortPlayers(players);
    
    // Render player bars
    const container = document.getElementById('player-bars-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    sorted.forEach(player => {
        const bar = createPlayerBar(player);
        container.appendChild(bar);
    });
}

function sortPlayers(players: PlayerData[]): PlayerData[] {
    return [...players].sort((a, b) => {
        let aVal = a[sortColumn] || 0;
        let bVal = b[sortColumn] || 0;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
        }
        
        return 0;
    });
}

// Helper functions
let lastWindowWidth = 0;
let lastWindowHeight = 0;

function getPlayerName(uid: string, currentName: string): string {
    if (currentName && currentName !== 'Unknown' && currentName.trim() !== '') {
        return currentName;
    }
    if (playerRegistryCache[uid]) {
        return playerRegistryCache[uid].name;
    }
    return 'Unknown';
}

function resizeWindowToContent(force: boolean = false): void {
    if (!window.electronAPI?.resizeWindowToContent) return;
    
    // Don't resize while dragging the window
    if (isDraggingWindow) return;
    
    requestAnimationFrame(() => {
        const dpsMeter = document.querySelector('.dps-meter');
        if (dpsMeter) {
            const rect = dpsMeter.getBoundingClientRect();
            const width = Math.ceil(rect.width);
            const height = Math.ceil(rect.height);
            
            if (width < 100 || height < 50 || width > 2000 || height > 1500) {
                devWarn('Invalid dimensions detected:', width, height);
                return;
            }
            
            if (force) {
                window.electronAPI.resizeWindowToContent(width, height);
                lastWindowWidth = width;
                lastWindowHeight = height;
                devLog('Forced resize to:', width, height);
            } else {
                const widthChanged = Math.abs(width - lastWindowWidth) > 5;
                const heightChanged = Math.abs(height - lastWindowHeight) > 5;
                
                if (widthChanged || heightChanged) {
                    window.electronAPI.resizeWindowToContent(width, height);
                    lastWindowWidth = width;
                    lastWindowHeight = height;
                }
            }
        }
    });
}

// Position colors for player bars
const positionBackgroundColors = [
    'rgba(180, 50, 60, 0.35)',
    'rgba(170, 60, 70, 0.32)',
    'rgba(160, 70, 80, 0.29)',
    'rgba(150, 80, 90, 0.26)',
    'rgba(140, 90, 100, 0.23)',
    'rgba(120, 100, 110, 0.20)',
    'rgba(100, 110, 120, 0.17)',
    'rgba(80, 120, 130, 0.14)',
    'rgba(70, 130, 140, 0.11)',
    'rgba(60, 140, 150, 0.08)'
];

function getPositionBackgroundColor(index: number): string {
    return positionBackgroundColors[index] || positionBackgroundColors[9];
}

function createPlayerBar(player: PlayerData): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'player-bar';
    
    // Get profession info - prefer sub-profession for icon if available
    const professionParts = (player.profession || '-').split('-');
    const subProfessionKey = professionParts[1];
    const mainProfessionKey = professionParts[0];
    const profInfo = subProfessionKey 
        ? getProfessionInfo(subProfessionKey) 
        : getProfessionInfo(mainProfessionKey);
    
    bar.innerHTML = `
        <div class="player-info">
            <img src="icons/${profInfo.icon}" class="profession-icon" alt="${profInfo.name}">
            <span class="player-name">${player.name}</span>
        </div>
        <div class="player-stats">
            <span class="stat-dmg">${formatStat(player.totalDmg)}</span>
            <span class="stat-dps">${formatDPS(player.realtimeDps)}</span>
        </div>
    `;
    
    return bar;
}

function renderPlayerBars(container: HTMLElement, userArray: any[], localUid: number | null): void {
    container.innerHTML = userArray.map((u: any, index: number) => {
        const professionParts = (u.profession || '-').split('-');
        const mainProfessionKey = professionParts[0];
        const subProfessionKey = professionParts[1];
        
        // Get profession info - prefer sub-profession for icon if available, otherwise use main
        const prof = subProfessionKey 
            ? getProfessionInfo(subProfessionKey) 
            : getProfessionInfo(mainProfessionKey);

        const translatedMainProf = translateProfession(mainProfessionKey);
        const translatedSubProf = subProfessionKey ? translateProfession(subProfessionKey) : null;
        let professionName = translatedMainProf;
        if (translatedSubProf) {
            professionName += ` - ${translatedSubProf}`;
        }

        const totalHits = u.total_count.total || 0;
        const crit = (u.total_count.critical !== undefined && totalHits > 0) ? Math.round((u.total_count.critical / totalHits) * 100) : '0';
        const lucky = (u.total_count.lucky !== undefined && totalHits > 0) ? Math.round((u.total_count.lucky / totalHits) * 100) : '0';
        const peak = (u.realtime_dps_max !== undefined) ? u.realtime_dps_max : 0;
        const dps = Number(u.total_dps) || 0;
        const totalHealing = u.total_healing ? (Number(u.total_healing.total) || 0) : 0;
        const nombre = getPlayerName(String(u.uid), u.name);
        const hpPercent = ((u.hp || 0) / (u.max_hp || 1)) * 100;
        const hpColor = hpPercent > 50 ? '#1db954' : hpPercent > 25 ? '#f39c12' : '#e74c3c';
        const bgColor = getPositionBackgroundColor(index);

        const position = index + 1;
        const isLocalPlayer = localUid && u.uid === localUid;
        let positionClasses = 'player-position';

        if (position === 1) {
            positionClasses += ' rank-1';
        } else if (position === 2) {
            positionClasses += ' rank-2';
        } else if (position === 3) {
            positionClasses += ' rank-3';
        }

        if (isLocalPlayer) {
            positionClasses += ' local-player';
        }

        return `<div class="player-bar" data-rank="${u.rank}" data-uid="${u.uid}" data-name="${nombre}" style="--damage-percent: ${u.damagePercent}%; --damage-bg-color: ${bgColor};">
                    <div class="player-info">
                        <span class="${positionClasses}">${position}</span>
                        <button class="add-to-registry-btn" data-uid="${u.uid}" data-name="${nombre}" title="Add to Player Registry">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                        <img class="class-icon" src="icons/${prof.icon}" alt="${professionName}" title="${professionName}">
                        <div class="player-details">
                            <span class="player-name">${nombre} <span style="color: var(--text-secondary); font-size: 9px; font-weight: 400;">(${t('ui.stats.gs')}: ${u.fightPoint})</span></span>
                            <div class="hp-bar">
                                <div class="hp-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
                                <span class="hp-text">${formatStat(u.hp || 0)}/${formatStat(u.max_hp || 0)}</span>
                            </div>
                        </div>
                        <div class="player-stats-main">
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.dps')}</span>
                                <span class="stat-value">${formatStat(dps)}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.hps')}</span>
                                <span class="stat-value">${formatStat(u.total_hps || 0)}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.totalDmg')}</span>
                                <span class="stat-value">${formatStat((u.total_damage && u.total_damage.total) || 0)}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.dmgTaken')}</span>
                                <span class="stat-value">${formatStat(u.taken_damage || 0)}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.percentDmg')}</span>
                                <span class="stat-value">${Math.round(u.damagePercent)}%</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.critPercent')}</span>
                                <span class="stat-value">${crit}%</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.critDmg')}</span>
                                <span class="stat-value">${formatStat((u.total_damage.critical || 0) + (u.total_damage.crit_lucky || 0))}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.avgCritDmg')}</span>
                                <span class="stat-value">${formatStat(((u.total_count.critical + u.total_count.crit_lucky) > 0 ? ((u.total_damage.critical || 0) + (u.total_damage.crit_lucky || 0)) / (u.total_count.critical + u.total_count.crit_lucky) : 0))}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.luckyPercent')}</span>
                                <span class="stat-value">${lucky}%</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.peakDps')}</span>
                                <span class="stat-value">${formatStat(peak)}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">${t('ui.stats.totalHeal')}</span>
                                <span class="stat-value">${formatStat(totalHealing)}</span>
                            </div>
                    </div>
                </div>
                </div>`;
    }).join('');
    
    // Add event listeners for add-to-registry buttons
    setTimeout(() => {
        const addButtons = container.querySelectorAll('.add-to-registry-btn');
        addButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const uid = (btn as HTMLElement).dataset.uid!;
                const name = (btn as HTMLElement).dataset.name!;
                addPlayerToRegistry(uid, name);
            });
        });
    }, 0);
}

function calculateSkillDPS(skill: any, startTime: number): number {
    const duration = (Date.now() - startTime) / 1000;
    return duration > 0 ? skill.totalDamage / duration : 0;
}

function renderSkillBreakdown(skillsData: any, startTime: number): void {
    const container = document.getElementById('player-bars-container');
    if (!container) return;

    if (!skillsData || Object.keys(skillsData).length === 0) {
        container.innerHTML = `<div class="skills-message">${t('ui.skills.noData')}</div>`;
        return;
    }

    const existingContainer = container.querySelector('.skills-container') as HTMLElement;
    const needsRebuild = !existingContainer || existingContainer.dataset.userCount !== String(Object.keys(skillsData).length);

    if (needsRebuild) {
        buildSkillBreakdownDOM(container, skillsData, startTime);
    } else {
        updateSkillBreakdownValues(container, skillsData, startTime);
    }
}

function buildSkillBreakdownDOM(container: HTMLElement, skillsData: any, startTime: number): void {
    let html = `<div class="skills-container" data-user-count="${Object.keys(skillsData).length}">`;

    const sortedUsers = Object.entries(skillsData).sort((a: any, b: any) => {
        const aTotal = Object.values(a[1].skills || {}).reduce((sum: number, skill: any) => sum + (skill.totalDamage || 0), 0) as number;
        const bTotal = Object.values(b[1].skills || {}).reduce((sum: number, skill: any) => sum + (skill.totalDamage || 0), 0) as number;
        return bTotal - aTotal;
    });

    for (const [uid, userData] of sortedUsers) {
        const data = userData as any;
        if (!data || !data.skills) continue;

        const professionParts = (data.profession || 'Unknown').split('-');
        const mainProfessionKey = professionParts[0];
        const subProfessionKey = professionParts[1];
        
        // Get profession info - prefer sub-profession for icon if available
        const prof = subProfessionKey 
            ? getProfessionInfo(subProfessionKey) 
            : getProfessionInfo(mainProfessionKey);

        const translatedMainProf = translateProfession(mainProfessionKey);
        const translatedSubProf = subProfessionKey ? translateProfession(subProfessionKey) : null;
        let professionDisplay = translatedMainProf;
        if (translatedSubProf) {
            professionDisplay += ` - ${translatedSubProf}`;
        }

        const playerName = getPlayerName(uid as string, data.name);
        
        html += `<div class="player-skill-section" data-uid="${uid}">
                <div class="player-skill-header" data-collapsible="user">
                    <svg class="collapse-icon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <img class="class-icon" src="icons/${prof.icon}" alt="${prof.name}">
                    <span class="player-name">${playerName}</span>
                    <span class="player-profession">${professionDisplay}</span>
                </div>
                <div class="skills-grid">`;

        const sortedSkills = Object.entries(data.skills).sort((a: any, b: any) =>
            (b[1].totalDamage || 0) - (a[1].totalDamage || 0)
        );

        for (const [skillId, skill] of sortedSkills) {
            const skillData = skill as any;
            if (skillData.totalDamage <= 0 && skillData.totalCount <= 0) continue;

            const skillDPS = calculateSkillDPS(skillData, startTime);
            const avgDamage = skillData.totalCount > 0 ? skillData.totalDamage / skillData.totalCount : 0;
            const translatedSkillName = translateSkill(skillId, skillData.displayName);
            const skillTypeText = skillData.type === '伤害' ? t('ui.skills.damage') : t('ui.skills.healing');
            const skillTypeClass = skillData.type === '伤害' ? 'damage' : 'healing';

            html += `<div class="skill-card" data-skill-id="${skillId}" data-uid="${uid}">
                    <div class="skill-header" data-collapsible="skill">
                        <div class="skill-header-left">
                            <svg class="collapse-icon" width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="skill-name">${translatedSkillName} (${skillId})</span>
                        </div>
                        <span class="skill-type ${skillTypeClass}">${skillTypeText}</span>
                    </div>
                    <div class="skill-stats">
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.skills.total')}</span>
                            <span class="skill-stat-value" data-stat="total">${formatStat(skillData.totalDamage)}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.stats.dps')}</span>
                            <span class="skill-stat-value" data-stat="dps">${formatStat(skillDPS)}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.skills.count')}</span>
                            <span class="skill-stat-value" data-stat="count">${skillData.totalCount}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.skills.avg')}</span>
                            <span class="skill-stat-value" data-stat="avg">${formatStat(avgDamage)}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.stats.critPercent')}</span>
                            <span class="skill-stat-value" data-stat="crit">${Math.round(skillData.critRate * 100)}%</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.stats.critDmg')}</span>
                            <span class="skill-stat-value" data-stat="critdmg">${formatStat((skillData.damageBreakdown?.critical || 0) + (skillData.damageBreakdown?.crit_lucky || 0))}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.stats.avgCritDmg')}</span>
                            <span class="skill-stat-value" data-stat="avgcrit">${formatStat(((skillData.countBreakdown?.critical || 0) + (skillData.countBreakdown?.crit_lucky || 0)) > 0 ? ((skillData.damageBreakdown?.critical || 0) + (skillData.damageBreakdown?.crit_lucky || 0)) / ((skillData.countBreakdown?.critical || 0) + (skillData.countBreakdown?.crit_lucky || 0)) : 0)}</span>
                        </div>
                        <div class="skill-stat">
                            <span class="skill-stat-label">${t('ui.stats.luckyPercent')}</span>
                            <span class="skill-stat-value" data-stat="lucky">${Math.round(skillData.luckyRate * 100)}%</span>
                        </div>
                    </div>
                </div>`;
        }

        html += '</div></div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

function updateSkillBreakdownValues(container: HTMLElement, skillsData: any, startTime: number): void {
    for (const [uid, userData] of Object.entries(skillsData)) {
        const data = userData as any;
        if (!data || !data.skills) continue;

        for (const [skillId, skill] of Object.entries(data.skills)) {
            const skillData = skill as any;
            const skillCard = container.querySelector(`.skill-card[data-skill-id="${skillId}"][data-uid="${uid}"]`);
            if (!skillCard) continue;

            const skillDPS = calculateSkillDPS(skillData, startTime);
            const avgDamage = skillData.totalCount > 0 ? skillData.totalDamage / skillData.totalCount : 0;

            const totalEl = skillCard.querySelector('[data-stat="total"]');
            const dpsEl = skillCard.querySelector('[data-stat="dps"]');
            const countEl = skillCard.querySelector('[data-stat="count"]');
            const avgEl = skillCard.querySelector('[data-stat="avg"]');
            const critEl = skillCard.querySelector('[data-stat="crit"]');
            const critDmgEl = skillCard.querySelector('[data-stat="critdmg"]');
            const avgCritEl = skillCard.querySelector('[data-stat="avgcrit"]');
            const luckyEl = skillCard.querySelector('[data-stat="lucky"]');

            const critDmg = (skillData.damageBreakdown?.critical || 0) + (skillData.damageBreakdown?.crit_lucky || 0);
            const critCount = (skillData.countBreakdown?.critical || 0) + (skillData.countBreakdown?.crit_lucky || 0);
            const avgCritDmg = critCount > 0 ? critDmg / critCount : 0;

            if (totalEl) totalEl.textContent = formatStat(skillData.totalDamage);
            if (dpsEl) dpsEl.textContent = formatStat(skillDPS);
            if (countEl) countEl.textContent = String(skillData.totalCount);
            if (avgEl) avgEl.textContent = formatStat(avgDamage);
            if (critEl) critEl.textContent = `${Math.round(skillData.critRate * 100)}%`;
            if (critDmgEl) critDmgEl.textContent = formatStat(critDmg);
            if (avgCritEl) avgCritEl.textContent = formatStat(avgCritDmg);
            if (luckyEl) luckyEl.textContent = `${Math.round(skillData.luckyRate * 100)}%`;
        }
    }
}

// Handle collapsible sections in skills breakdown
document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const header = target.closest('[data-collapsible]') as HTMLElement;
    
    if (!header) return;
    
    const collapsibleType = header.getAttribute('data-collapsible');
    
    if (collapsibleType === 'user') {
        // Toggle player skill section
        const section = header.closest('.player-skill-section');
        if (!section) return;
        
        const skillsGrid = section.querySelector('.skills-grid') as HTMLElement;
        const icon = header.querySelector('.collapse-icon') as SVGElement;
        
        if (skillsGrid && icon) {
            section.classList.toggle('collapsed');
            if (section.classList.contains('collapsed')) {
                skillsGrid.style.display = 'none';
                icon.style.transform = 'rotate(-90deg)';
            } else {
                skillsGrid.style.display = 'grid';
                icon.style.transform = 'rotate(0deg)';
            }
        }
    } else if (collapsibleType === 'skill') {
        // Toggle individual skill card
        const skillCard = header.closest('.skill-card');
        if (!skillCard) return;
        
        const skillStats = skillCard.querySelector('.skill-stats') as HTMLElement;
        const icon = header.querySelector('.collapse-icon') as SVGElement;
        
        if (skillStats && icon) {
            skillCard.classList.toggle('collapsed');
            if (skillCard.classList.contains('collapsed')) {
                skillStats.style.display = 'none';
                icon.style.transform = 'rotate(-90deg)';
            } else {
                skillStats.style.display = 'grid';
                icon.style.transform = 'rotate(0deg)';
            }
        }
    }
});

// Export for debugging
(window as any).appState = {
    viewMode,
    sortColumn,
    sortDirection,
    isLocked,
    getCurrentLanguage
};
