import { useState, useEffect, useCallback } from "react";

export interface UseHistorySettingsReturn {
    isHistorySavingEnabled: boolean;
    isLoading: boolean;
    toggleHistorySaving: () => Promise<void>;
}

export function useHistorySettings(): UseHistorySettingsReturn {
    const [isHistorySavingEnabled, setIsHistorySavingEnabled] =
        useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Check history saving status
    const checkStatus = useCallback(async () => {
        try {
            const response = await fetch("/api/settings");
            const result = await response.json();

            if (result.code === 0) {
                const enabled = result.data.enableHistorySave || false;
                setIsHistorySavingEnabled(enabled);
            }

            setIsLoading(false);
        } catch (error) {
            console.error("Failed to check history status:", error);
            setIsLoading(false);
        }
    }, []);

    // Toggle history saving
    const toggleHistorySaving = useCallback(async () => {
        try {
            const settingsRes = await fetch("/api/settings");
            const settings = await settingsRes.json();

            if (settings.code !== 0) return;

            const newEnabled = !settings.data.enableHistorySave;

            const updateRes = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...settings.data,
                    enableHistorySave: newEnabled,
                }),
            });

            const result = await updateRes.json();
            if (result.code === 0) {
                setIsHistorySavingEnabled(newEnabled);
                console.log(
                    `History saving ${newEnabled ? "enabled" : "disabled"}`,
                );
            }
        } catch (error) {
            console.error("Failed to toggle history saving:", error);
        }
    }, []);

    // Load initial status
    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    return {
        isHistorySavingEnabled,
        isLoading,
        toggleHistorySaving,
    };
}
