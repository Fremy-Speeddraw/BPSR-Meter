// History viewer for BPSR-Meter
import { devLog, devWarn, devError } from '../utils/logger';

interface HistorySummary {
    startTime: number;
    endTime: number;
    duration: number;
    userCount: number;
    version: string;
    topDamage?: {
        uid: number;
        name: string;
        total: number;
    };
}

interface HistoryUserData {
    [uid: string]: {
        name: string;
        profession: string;
        total_count: {
            normal: number;
            critical: number;
            lucky: number;
            crit_lucky: number;
            hpLessen: number;
            total: number;
        };
        total_damage: {
            normal: number;
            critical: number;
            lucky: number;
            crit_lucky: number;
            hpLessen: number;
            total: number;
        };
        total_healing: {
            normal: number;
            critical: number;
            lucky: number;
            crit_lucky: number;
            hpLessen: number;
            total: number;
        };
        total_dps: number;
        total_hps: number;
    };
}

// Translation support
let currentLanguage = 'en';
let translations: any = {};

// Player registry cache
interface PlayerRegistry {
    [uid: string]: {
        uid: string;
        name: string;
    };
}

let playerRegistryCache: PlayerRegistry = {};

async function loadTranslations(lang: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/translations/${lang}`);
        if (!response.ok) {
            devError('Translation response not ok:', response.status);
            return false;
        }
        
        const result = await response.json();
        if (result.code === 0 && result.data) {
            translations = result.data;
            currentLanguage = lang;
            devLog('Loaded translations for language:', lang);
            devLog('Skills loaded:', translations.skills ? Object.keys(translations.skills).length : 0);
            devLog('Sample skills:', translations.skills ? Object.keys(translations.skills).slice(0, 10) : []);
            return true;
        }
        return false;
    } catch (error) {
        devError('Failed to load translations:', error);
        return false;
    }
}

function translateSkill(skillId: string, fallback: string): string {
    const id = String(skillId);
    const translated = translations.skills?.[id] || fallback;
    devLog(`Translating skill ${id}: ${fallback} -> ${translated}`);
    devLog(`Available translations:`, translations.skills ? Object.keys(translations.skills).length : 0);
    return translated;
}

function translateProfession(profession: string): string {
    return translations.professions?.[profession] || profession;
}

async function loadPlayerRegistry(): Promise<void> {
    try {
        const response = await fetch('/api/player-registry');
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            playerRegistryCache = result.data;
            devLog('Loaded player registry:', Object.keys(playerRegistryCache).length, 'players');
        }
    } catch (error) {
        devError('Failed to load player registry:', error);
    }
}

function getPlayerName(uid: string, currentName: string): string {
    // If current name is valid, use it
    if (currentName && currentName !== 'Unknown' && currentName.trim() !== '') {
        return currentName;
    }
    // Otherwise check registry
    if (playerRegistryCache[uid]) {
        return playerRegistryCache[uid].name;
    }
    return 'Unknown';
}

// Setup window dragging (same as group window)
function setupDragging(): void {
    const dragIndicator = document.getElementById('drag-indicator');
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

// Initialize dragging
setupDragging();

// Close button handler
const closeButton = document.getElementById('close-button');
if (closeButton) {
    closeButton.addEventListener('click', () => {
        window.close();
    });
}

// Format duration
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Format date
function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Format number with K/M suffix
function formatStat(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
}

// Load history list
async function loadHistoryList(): Promise<void> {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    historyList.innerHTML = `
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading history...
        </div>
    `;

    try {
        const response = await fetch('/api/history/list');
        const result = await response.json();

        if (result.code !== 0 || !result.data || result.data.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 32px; opacity: 0.3; margin-bottom: 12px;"></i>
                    <p>No combat history found</p>
                    <p style="font-size: 11px; opacity: 0.6; margin-top: 8px;">Enable history saving to record combat sessions</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp descending (newest first)
        const timestamps = result.data.sort((a: string, b: string) => parseInt(b) - parseInt(a));

        // Load summaries for each timestamp
        const historyItems: { timestamp: string; summary?: HistorySummary }[] = [];
        
        for (const timestamp of timestamps) {
            try {
                const summaryRes = await fetch(`/api/history/${timestamp}/summary`);
                const summaryData = await summaryRes.json();
                historyItems.push({
                    timestamp,
                    summary: summaryData.code === 0 ? summaryData.data : undefined
                });
            } catch (error) {
                devWarn(`Failed to load summary for ${timestamp}:`, error);
                historyItems.push({ timestamp });
            }
        }

        // Render history list
        historyList.innerHTML = historyItems.map(({ timestamp, summary }) => {
            const date = formatDate(parseInt(timestamp));
            const duration = summary ? formatDuration(summary.duration) : 'Unknown';
            const userCount = summary?.userCount || 0;
            const topDmg = summary?.topDamage ? formatStat(summary.topDamage.total) : '-';

            return `
                <div class="history-item" data-timestamp="${timestamp}">
                    <div class="history-item-header">
                        <i class="fa-solid fa-clock"></i>
                        <span class="history-date">${date}</span>
                    </div>
                    <div class="history-item-stats">
                        <div class="history-stat">
                            <i class="fa-solid fa-hourglass-half"></i>
                            <span>${duration}</span>
                        </div>
                        <div class="history-stat">
                            <i class="fa-solid fa-users"></i>
                            <span>${userCount} players</span>
                        </div>
                        <div class="history-stat">
                            <i class="fa-solid fa-burst"></i>
                            <span>${topDmg}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', async () => {
                const timestamp = item.getAttribute('data-timestamp');
                if (timestamp) {
                    // Remove active class from all items
                    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                    // Add active class to clicked item
                    item.classList.add('active');
                    await loadHistoryDetails(timestamp);
                }
            });
        });

    } catch (error) {
        devError('Failed to load history list:', error);
        historyList.innerHTML = `
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load history</p>
            </div>
        `;
    }
}

// Load history details
async function loadHistoryDetails(timestamp: string): Promise<void> {
    const historyDetails = document.getElementById('history-details');
    if (!historyDetails) return;

    historyDetails.innerHTML = `
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading details...
        </div>
    `;

    try {
        const [summaryRes, dataRes] = await Promise.all([
            fetch(`/api/history/${timestamp}/summary`),
            fetch(`/api/history/${timestamp}/data`)
        ]);

        const summaryData = await summaryRes.json();
        const userData = await dataRes.json();

        if (summaryData.code !== 0 || userData.code !== 0) {
            throw new Error('Failed to load history data');
        }

        const summary: HistorySummary = summaryData.data;
        const users: HistoryUserData = userData.user;

        // Sort users by damage
        const sortedUsers = Object.entries(users).sort((a, b) => b[1].total_damage.total - a[1].total_damage.total);

        // Calculate total damage
        const totalDamage = sortedUsers.reduce((sum, [, user]) => sum + user.total_damage.total, 0);

        // Render details
        historyDetails.innerHTML = `
            <div class="history-details-header">
                <h4>Combat Session</h4>
                <div class="history-details-meta">
                    <div class="meta-item">
                        <i class="fa-solid fa-calendar"></i>
                        <span>${formatDate(summary.startTime)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fa-solid fa-hourglass-half"></i>
                        <span>${formatDuration(summary.duration)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fa-solid fa-users"></i>
                        <span>${summary.userCount} players</span>
                    </div>
                </div>
            </div>
            
            <div class="history-player-list">
                ${sortedUsers.map(([uid, user], index) => {
                    const percentage = totalDamage > 0 ? (user.total_damage.total / totalDamage * 100) : 0;
                    const rank = index + 1;
                    const playerName = getPlayerName(uid, user.name);
                    
                    // Translate profession
                    const professionParts = (user.profession || '').split('-');
                    const mainProf = professionParts[0];
                    const subProf = professionParts[1];
                    const translatedMainProf = translateProfession(mainProf);
                    const translatedSubProf = subProf ? translateProfession(subProf) : null;
                    const displayProfession = translatedSubProf 
                        ? translatedSubProf
                        : translatedMainProf;
                    
                    return `
                        <div class="history-player-item">
                            <div class="player-rank">#${rank}</div>
                            <div class="player-info">
                                <div class="player-name">${playerName}</div>
                                <div class="player-profession">${displayProfession}</div>
                            </div>
                            <div class="player-stats">
                                <div class="player-stat">
                                    <span class="stat-label">Damage</span>
                                    <span class="stat-value">${formatStat(user.total_damage.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">DPS</span>
                                    <span class="stat-value">${formatStat(user.total_dps)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Hits</span>
                                    <span class="stat-value">${formatStat(user.total_count.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Heals</span>
                                    <span class="stat-value">${formatStat(user.total_healing.total)}</span>
                                </div>
                                <div class="player-stat">
                                    <span class="stat-label">Share</span>
                                    <span class="stat-value">${percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <button class="view-skills-btn" data-timestamp="${timestamp}" data-uid="${uid}" title="View skill breakdown">
                                <i class="fa-solid fa-chart-bar"></i>
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Add skill view handlers
        document.querySelectorAll('.view-skills-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget as HTMLElement;
                const ts = button.getAttribute('data-timestamp');
                const uid = button.getAttribute('data-uid');
                if (ts && uid) {
                    await loadPlayerSkills(ts, uid);
                }
            });
        });

    } catch (error) {
        devError('Failed to load history details:', error);
        historyDetails.innerHTML = `
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load combat details</p>
            </div>
        `;
    }
}

// Load player skill breakdown from history
async function loadPlayerSkills(timestamp: string, uid: string): Promise<void> {
    const modal = document.getElementById('skill-modal');
    const modalTitle = document.getElementById('skill-modal-title');
    const modalBody = document.getElementById('skill-modal-body');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    // Show modal
    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <div class="loading-indicator">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading skills...
        </div>
    `;
    
    try {
        const response = await fetch(`/api/history/${timestamp}/skill/${uid}`);
        const result = await response.json();
        
        if (result.code !== 0) {
            throw new Error('Failed to load skill data');
        }
        
        const userData = result.data;
        const skills = userData.skills;
        
        // Set modal title with player name from registry
        const playerName = getPlayerName(uid, userData.name);
        modalTitle.textContent = `${playerName} - Skill Breakdown`;
        
        // Sort skills by damage
        const sortedSkills = Object.entries(skills).sort((a: any, b: any) => b[1].totalDamage - a[1].totalDamage);
        
        // Calculate total damage
        const totalDamage = sortedSkills.reduce((sum: number, [, skill]: [string, any]) => sum + skill.totalDamage, 0);
        
        // Render skills
        modalBody.innerHTML = `
            <div class="skill-list">
                ${sortedSkills.map(([skillId, skill]: [string, any]) => {
                    const percentage = totalDamage > 0 ? (skill.totalDamage / totalDamage * 100) : 0;
                    const critRate = skill.totalCount > 0 ? (skill.critCount / skill.totalCount * 100) : 0;
                    const luckyRate = skill.totalCount > 0 ? (skill.luckyCount / skill.totalCount * 100) : 0;
                    const translatedName = translateSkill(skillId, skill.displayName);
                    
                    return `
                        <div class="skill-item">
                            <div class="skill-header">
                                <div class="skill-name">${translatedName}</div>
                                <div class="skill-damage">${formatStat(skill.totalDamage)}</div>
                            </div>
                            <div class="skill-details">
                                <div class="skill-detail">
                                    <span class="detail-label">Share:</span>
                                    <span class="detail-value">${percentage.toFixed(1)}%</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Hits:</span>
                                    <span class="detail-value">${skill.totalCount.toLocaleString()}</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Crit:</span>
                                    <span class="detail-value">${critRate.toFixed(1)}%</span>
                                </div>
                                <div class="skill-detail">
                                    <span class="detail-label">Lucky:</span>
                                    <span class="detail-value">${luckyRate.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div class="skill-progress">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        devError('Failed to load player skills:', error);
        modalBody.innerHTML = `
            <div class="empty-state error">
                <i class="fa-solid fa-exclamation-triangle" style="font-size: 32px; color: #ff6b7a; margin-bottom: 12px;"></i>
                <p>Failed to load skill breakdown</p>
            </div>
        `;
    }
}

// Check history saving status
async function checkHistoryStatus(): Promise<void> {
    try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        
        const enableBtn = document.getElementById('enable-history-btn');
        if (enableBtn && result.code === 0) {
            const enabled = result.data.enableHistorySave || false;
            
            if (enabled) {
                enableBtn.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Saving Enabled';
                enableBtn.classList.add('enabled');
            } else {
                enableBtn.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Enable Saving';
                enableBtn.classList.remove('enabled');
            }
        }
    } catch (error) {
        devError('Failed to check history status:', error);
    }
}

// Toggle history saving
async function toggleHistorySaving(): Promise<void> {
    try {
        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        
        if (settings.code !== 0) return;
        
        const newEnabled = !settings.data.enableHistorySave;
        
        const updateRes = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...settings.data,
                enableHistorySave: newEnabled
            })
        });
        
        const result = await updateRes.json();
        if (result.code === 0) {
            await checkHistoryStatus();
            devLog(`History saving ${newEnabled ? 'enabled' : 'disabled'}`);
        }
    } catch (error) {
        devError('Failed to toggle history saving:', error);
    }
}

// Event handlers
const refreshBtn = document.getElementById('refresh-history-btn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', loadHistoryList);
}

const enableBtn = document.getElementById('enable-history-btn');
if (enableBtn) {
    enableBtn.addEventListener('click', toggleHistorySaving);
}

// Skill modal close handlers
const closeSkillModal = document.getElementById('close-skill-modal');
if (closeSkillModal) {
    closeSkillModal.addEventListener('click', () => {
        const modal = document.getElementById('skill-modal');
        if (modal) modal.style.display = 'none';
    });
}

const skillModal = document.getElementById('skill-modal');
if (skillModal) {
    skillModal.addEventListener('click', (e) => {
        if (e.target === skillModal) {
            skillModal.style.display = 'none';
        }
    });
}

// Initial load
(async () => {
    // Load translations from settings
    try {
        const settingsRes = await fetch('/api/settings');
        const settings = await settingsRes.json();
        
        if (settings.code === 0 && settings.data.language) {
            const lang = settings.data.language;
            await loadTranslations(lang);
            devLog(`History window loaded with language: ${lang}`);
        } else {
            // Fallback to English
            await loadTranslations('en');
        }
    } catch (error) {
        devError('Failed to load language settings:', error);
        await loadTranslations('en');
    }
    
    // Load player registry
    await loadPlayerRegistry();
    
    await checkHistoryStatus();
    await loadHistoryList();
})();

// Refresh player registry periodically
setInterval(loadPlayerRegistry, 10000);
