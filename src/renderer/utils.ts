/**
 * Utility functions for formatting and display
 */

export function formatStat(value: number): string {
    if (value >= 1000000000000) {
        return (value / 1000000000000).toFixed(1) + 'T';
    }
    if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + 'G';
    }
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'k';
    }
    return value.toFixed(0);
}

export function formatPercent(value: number): string {
    if (value >= 100) return '100%';
    if (value < 0.01 && value > 0) return '<0.01%';
    return value.toFixed(2) + '%';
}

export function formatDPS(value: number): string {
    return formatStat(value) + '/s';
}

export function formatHP(current: number, max: number): string {
    const percent = max > 0 ? (current / max * 100).toFixed(0) : '0';
    return `${formatStat(current)}/${formatStat(max)} (${percent}%)`;
}

export function formatCritRate(value: number): string {
    return value.toFixed(1) + '%';
}

export function getRoleColor(role: 'dps' | 'tank' | 'healer'): string {
    switch (role) {
        case 'dps':
            return '#ff4444';
        case 'tank':
            return '#4444ff';
        case 'healer':
            return '#44ff44';
        default:
            return '#ffffff';
    }
}

export function getHPColor(currentHp: number, maxHp: number): string {
    const percent = maxHp > 0 ? (currentHp / maxHp) * 100 : 100;
    
    if (percent > 75) return '#4ade80'; // green
    if (percent > 50) return '#fbbf24'; // yellow
    if (percent > 25) return '#fb923c'; // orange
    return '#ef4444'; // red
}

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        
        if (timeout) {
            clearTimeout(timeout);
        }
        
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    
    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}
