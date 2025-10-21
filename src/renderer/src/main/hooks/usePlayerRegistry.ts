import { useState, useEffect, useCallback } from "react";
import type { PlayerRegistry } from "../../shared/types";

export interface UsePlayerRegistryReturn {
    playerRegistry: PlayerRegistry;
    getPlayerName: (uid: string, currentName: string) => string;
    addToRegistry: (uid: string, name: string) => Promise<boolean>;
    refreshRegistry: () => Promise<void>;
}

export function usePlayerRegistry(): UsePlayerRegistryReturn {
    const [playerRegistry, setPlayerRegistry] = useState<PlayerRegistry>({});

    // Load player registry from server
    const loadRegistry = useCallback(async () => {
        try {
            const response = await fetch("/api/player-registry");
            const result = await response.json();

            if (result.code === 0 && result.data) {
                setPlayerRegistry(result.data);
                console.log(
                    "Loaded player registry:",
                    Object.keys(result.data).length,
                    "players",
                );
            }
        } catch (error) {
            console.error("Failed to load player registry:", error);
        }
    }, []);

    // Load registry on mount
    useEffect(() => {
        loadRegistry();
    }, [loadRegistry]);

    // Refresh registry every 10 seconds
    useEffect(() => {
        const interval = setInterval(loadRegistry, 10000);
        return () => clearInterval(interval);
    }, [loadRegistry]);

    // Get player name with registry fallback
    const getPlayerName = useCallback(
        (uid: string, currentName: string): string => {
            // If current name is valid, use it
            if (
                currentName &&
                currentName !== "Unknown" &&
                currentName.trim() !== ""
            ) {
                return currentName;
            }

            // Otherwise check registry
            if (playerRegistry[uid]) {
                return playerRegistry[uid].name;
            }

            return "Unknown";
        },
        [playerRegistry],
    );

    // Add player to registry
    const addToRegistry = useCallback(
        async (uid: string, name: string): Promise<boolean> => {
            try {
                const response = await fetch("/api/player-registry/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid, name }),
                });

                const result = await response.json();

                if (result.code === 0 && result.data) {
                    setPlayerRegistry(result.data);
                    console.log(`Added player to registry: ${uid} -> ${name}`);
                    return true;
                }

                return false;
            } catch (error) {
                console.error("Failed to add player to registry:", error);
                return false;
            }
        },
        [],
    );

    return {
        playerRegistry,
        getPlayerName,
        addToRegistry,
        refreshRegistry: loadRegistry,
    };
}
