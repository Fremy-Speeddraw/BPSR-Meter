/**
 * Translation system for multi-language support
 */

import type { Translations, ApiResponse } from './types';

let currentLanguage: string = 'en';
let translations: Translations = {};

export async function loadTranslations(lang: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/translations/${lang}`);

        if (!response.ok) {
            console.error('Translation response not ok:', response.status, response.statusText);
            return false;
        }

        const result: ApiResponse<Translations> = await response.json();

        if (result.code === 0 && result.data) {
            translations = result.data;
            currentLanguage = lang;
            console.log('Successfully loaded translations for language:', lang);
            console.log('Loaded skills:', Object.keys(translations.skills || {}).length, 'translations');
            return true;
        } else {
            console.error('Translation API returned error:', result);
            return false;
        }
    } catch (error) {
        console.error('Failed to load translations:', error);
        return false;
    }
}

export function t(key: string, fallback: string | null = null): string {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return fallback || key;
        }
    }

    return value || fallback || key;
}

export function translateSkill(skillId: number | string, fallback: string | null = null): string {
    const skillIdStr = String(skillId);
    
    if (!translations.skills) {
        return fallback || skillIdStr;
    }
    
    return translations.skills[skillIdStr] || fallback || skillIdStr;
}

export function translateProfession(profession: string): string {
    return translations.professions?.[profession] || profession;
}

export function getCurrentLanguage(): string {
    return currentLanguage;
}

export function getTranslations(): Translations {
    return translations;
}

// Debug functions
export function testTranslations(): void {
    console.log('Current language:', currentLanguage);
    console.log('Translations object:', translations);
    console.log('Sample skill translation for 1241:', translateSkill('1241', 'fallback'));
    console.log('Sample UI translation for ui.controls.skills:', t('ui.controls.skills', 'fallback'));
}

export async function forceLoadTranslations(lang: string): Promise<void> {
    console.log('Force loading translations for:', lang);
    const success = await loadTranslations(lang);
    console.log('Load success:', success);
    if (success) {
        // updateUITranslations will be called from main.ts
        console.log('Translation loaded successfully');
    }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    (window as any).testTranslations = testTranslations;
    (window as any).forceLoadTranslations = forceLoadTranslations;
}
