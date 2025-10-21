import { useState, useEffect, useCallback, useRef } from "react";
import { useInterval } from "../../shared/hooks";
import type {
    ViewMode,
    SortColumn,
    SortDirection,
    ManualGroupState,
} from "../../shared/types";

export interface PlayerUser {
    uid: number;
    name: string;
    profession: string;
    total_damage: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    total_count: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
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
    taken_damage: number;
    total_dps: number;
    total_hps: number;
    realtime_dps_max: number;
    hp: number;
    max_hp: number;
    fightPoint: number;
    damagePercent?: number;
}

export interface SkillData {
    displayName: string;
    type: string;
    elementype: string;
    totalDamage: number;
    totalCount: number;
    critCount: number;
    luckyCount: number;
    critRate: number;
    luckyRate: number;
    damageBreakdown: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        hpLessen: number;
        total: number;
    };
    countBreakdown: {
        normal: number;
        critical: number;
        lucky: number;
        crit_lucky: number;
        total: number;
    };
}

export interface SkillsDataByUser {
    [uid: string]: {
        uid: number;
        name: string;
        profession: string;
        skills: {
            [skillId: string]: SkillData;
        };
    };
}

export interface UseDataFetchingOptions {
    viewMode: ViewMode;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    manualGroupState: ManualGroupState | null;
    onServerReset?: () => void;
}

export interface UseDataFetchingReturn {
    players: PlayerUser[];
    skillsData: SkillsDataByUser | null;
    localUid: number | null;
    isLoading: boolean;
    isPaused: boolean;
    togglePause: () => Promise<void>;
    startTime: number;
}

export function useDataFetching(
    options: UseDataFetchingOptions,
): UseDataFetchingReturn {
    const {
        viewMode,
        sortColumn,
        sortDirection,
        manualGroupState,
        onServerReset,
    } = options;

    const [players, setPlayers] = useState<PlayerUser[]>([]);
    const [skillsData, setSkillsData] = useState<SkillsDataByUser | null>(null);
    const [localUid, setLocalUid] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [startTime, setStartTime] = useState<number>(Date.now());

    const lastStartTimeRef = useRef<number>(0);
    const lastTotalDamageRef = useRef<number>(0);

    // Sync pause state from server on mount
    useEffect(() => {
        const syncPauseState = async () => {
            try {
                const resp = await fetch("/api/pause");
                const json = await resp.json();
                if (json && typeof json.paused === "boolean") {
                    setIsPaused(json.paused);
                }
            } catch (err) {
                console.error("Failed to fetch server pause state:", err);
            }
        };

        syncPauseState();
    }, []);

    // Toggle pause handler
    const togglePause = useCallback(async () => {
        const newPausedState = !isPaused;
        setIsPaused(newPausedState);

        // Notify server about pause/resume
        try {
            const resp = await fetch("/api/pause", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paused: newPausedState }),
            });
            const json = await resp.json();

            // Sync with server response
            if (json && typeof json.paused === "boolean") {
                setIsPaused(json.paused);
            }
        } catch (err) {
            console.error("Failed to update server pause state:", err);
        }
    }, [isPaused]);

    // Main data fetching function
    const fetchData = useCallback(async () => {
        try {
            // Skills view mode - fetch skill breakdown
            if (viewMode === "skills") {
                const skillsRes = await fetch("/api/skills");
                const skillsDataRes = await skillsRes.json();

                if (
                    skillsDataRes.code === 0 &&
                    skillsDataRes.data &&
                    skillsDataRes.data.skills
                ) {
                    setSkillsData(skillsDataRes.data.skills);
                    setStartTime(skillsDataRes.startTime || Date.now());
                    setIsLoading(
                        Object.keys(skillsDataRes.data.skills).length === 0,
                    );
                } else {
                    setSkillsData(null);
                    setIsLoading(true);
                }
                return;
            }

            // Normal/Solo view mode - fetch player data
            const apiEndpoint =
                viewMode === "solo" ? "/api/solo-user" : "/api/data";
            const response = await fetch(apiEndpoint);
            const userData = await response.json();

            // Detect server reset
            if (
                userData.startTime &&
                userData.startTime !== lastStartTimeRef.current
            ) {
                console.log("Server reset detected. Clearing local state.");
                lastStartTimeRef.current = userData.startTime;
                lastTotalDamageRef.current = 0;
                onServerReset?.();
            }

            // Convert users object to array
            let userArray: PlayerUser[] = Object.entries(userData.user).map(
                ([uid, data]: [string, any]) => ({
                    ...data,
                    uid: parseInt(uid, 10),
                }),
            );

            // Filter out players with no activity
            userArray = userArray.filter(
                (u: PlayerUser) =>
                    (u.total_damage && u.total_damage.total > 0) ||
                    u.taken_damage > 0 ||
                    (u.total_healing && u.total_healing.total > 0),
            );

            // Apply manual group filtering
            if (
                manualGroupState &&
                manualGroupState.enabled &&
                manualGroupState.members &&
                manualGroupState.members.length > 0
            ) {
                const groupUids = manualGroupState.members;
                userArray = userArray.filter((u: PlayerUser) =>
                    groupUids.includes(String(u.uid)),
                );
                console.log(
                    `Manual group filter applied: ${userArray.length} players in group`,
                );
            }

            // Check if we have data
            if (!userArray || userArray.length === 0) {
                setPlayers([]);
                setIsLoading(true);
                return;
            }

            setIsLoading(false);

            // Calculate total damage for percentages
            const sumaTotalDamage = userArray.reduce(
                (acc: number, u: PlayerUser) =>
                    acc +
                    (u.total_damage && u.total_damage.total
                        ? Number(u.total_damage.total)
                        : 0),
                0,
            );

            if (sumaTotalDamage !== lastTotalDamageRef.current) {
                lastTotalDamageRef.current = sumaTotalDamage;
            }

            // Calculate damage percent for each player
            userArray.forEach((u: PlayerUser) => {
                const userDamage =
                    u.total_damage && u.total_damage.total
                        ? Number(u.total_damage.total)
                        : 0;
                u.damagePercent =
                    sumaTotalDamage > 0
                        ? Math.max(
                              0,
                              Math.min(
                                  100,
                                  (userDamage / sumaTotalDamage) * 100,
                              ),
                          )
                        : 0;
            });

            // Get local user UID
            let currentLocalUid: number | null = null;
            if (viewMode === "solo") {
                const uidKey = Object.keys(userData.user)[0];
                currentLocalUid = uidKey ? parseInt(uidKey, 10) : null;
            } else {
                try {
                    const localUserResponse = await fetch("/api/solo-user");
                    const localUserData = await localUserResponse.json();
                    if (
                        localUserData.user &&
                        Object.keys(localUserData.user).length > 0
                    ) {
                        currentLocalUid = parseInt(
                            Object.keys(localUserData.user)[0],
                            10,
                        );
                    }
                } catch (err) {
                    console.log("Could not get local user:", err);
                }
            }

            setLocalUid(currentLocalUid);

            // Sort users
            sortUserArray(userArray, sortColumn, sortDirection);

            // Handle top 10 + local user for nearby mode
            let finalArray = userArray;
            if (viewMode === "nearby" && currentLocalUid) {
                const top10 = userArray.slice(0, 10);
                const isLocalInTop10 = top10.some(
                    (u: PlayerUser) => u.uid === currentLocalUid,
                );

                if (userArray.length > 10 && !isLocalInTop10) {
                    const localUserExtra = userArray.find(
                        (u: PlayerUser) => u.uid === currentLocalUid,
                    );
                    if (localUserExtra) {
                        finalArray = [...top10, localUserExtra];
                    } else {
                        finalArray = userArray;
                    }
                } else {
                    finalArray = userArray;
                }
            }

            setPlayers(finalArray);
        } catch (err) {
            console.error("Error in fetchData:", err);
            setPlayers([]);
            setIsLoading(true);
        }
    }, [viewMode, sortColumn, sortDirection, manualGroupState, onServerReset]);

    // Data polling loop (50ms when not paused)
    useInterval(fetchData, isPaused ? null : 50);

    return {
        players,
        skillsData,
        localUid,
        isLoading,
        isPaused,
        togglePause,
        startTime,
    };
}

// Helper function to sort user array
function sortUserArray(
    userArray: PlayerUser[],
    sortColumn: SortColumn,
    sortDirection: SortDirection,
): void {
    userArray.sort((a, b) => {
        let aVal: number, bVal: number;

        switch (sortColumn) {
            case "totalDmg":
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
                break;
            case "totalDmgTaken":
                aVal = Number(a.taken_damage) || 0;
                bVal = Number(b.taken_damage) || 0;
                break;
            case "totalHeal":
                aVal = a.total_healing?.total
                    ? Number(a.total_healing.total)
                    : 0;
                bVal = b.total_healing?.total
                    ? Number(b.total_healing.total)
                    : 0;
                break;
            case "realtimeDps":
                aVal = Number(a.total_dps) || 0;
                bVal = Number(b.total_dps) || 0;
                break;
            default:
                aVal = a.total_damage?.total ? Number(a.total_damage.total) : 0;
                bVal = b.total_damage?.total ? Number(b.total_damage.total) : 0;
        }

        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
}
