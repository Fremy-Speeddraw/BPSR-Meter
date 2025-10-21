import React, { useState, useCallback, useEffect } from "react";
import { ControlBar } from "./components/ControlBar";
import { LoadingIndicator } from "./components/LoadingIndicator";
import { PlayerList } from "./components/PlayerList";
import { SkillsView } from "./components/SkillsView";
import { useDataFetching } from "./hooks/useDataFetching";
import { useElectronIntegration } from "./hooks/useElectronIntegration";
import { usePlayerRegistry } from "./hooks/usePlayerRegistry";
import { useManualGroup } from "./hooks/useManualGroup";
import { useTranslations } from "./hooks/useTranslations";
import { resetStatistics } from "../shared/api";
import type { ViewMode, SortColumn, SortDirection } from "../shared/types";

export function MainApp(): React.JSX.Element {
    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>("nearby");
    const [sortColumn, setSortColumn] = useState<SortColumn>("totalDmg");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    // Hooks
    const {
        currentLanguage,
        t,
        translateSkill,
        translateProfession,
        changeLanguage,
    } = useTranslations();
    const { playerRegistry, getPlayerName, addToRegistry } =
        usePlayerRegistry();
    const { manualGroupState } = useManualGroup();

    const {
        isLocked,
        toggleLock,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleMouseOver,
        handleMouseOut,
        handleMouseLeave,
        handleWheel,
    } = useElectronIntegration({
        baseWidth: 650,
        baseHeight: 700,
    });

    const {
        players,
        skillsData,
        localUid,
        isLoading,
        isPaused,
        togglePause,
        startTime,
    } = useDataFetching({
        viewMode,
        sortColumn,
        sortDirection,
        manualGroupState,
        onServerReset: () => {
            console.log("Server reset callback triggered");
        },
    });

    // Handle view mode toggle (Nearby <-> Solo)
    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === "nearby" ? "solo" : "nearby"));
    }, []);

    // Handle skills mode toggle
    const handleToggleSkillsMode = useCallback(() => {
        setViewMode((prev) => (prev === "skills" ? "nearby" : "skills"));
    }, []);

    // Handle sort column change
    const handleSortChange = useCallback(
        (column: SortColumn) => {
            if (sortColumn === column) {
                setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            } else {
                setSortColumn(column);
                setSortDirection("desc");
            }
        },
        [sortColumn],
    );

    // Handle sync/reset
    const handleSync = useCallback(async () => {
        await resetStatistics();
    }, []);

    // Handle language toggle
    const handleLanguageToggle = useCallback(async () => {
        const newLang = currentLanguage === "en" ? "zh" : "en";
        await changeLanguage(newLang);
    }, [currentLanguage, changeLanguage]);

    // Handle add to registry with visual feedback
    const handleAddToRegistry = useCallback(
        async (uid: string, name: string) => {
            const success = await addToRegistry(uid, name);

            if (success) {
                // Visual feedback is handled in the PlayerBar component through DOM manipulation
                // This is acceptable as it's a one-time visual effect
                const btn = document.querySelector(
                    `.add-to-registry-btn[data-uid="${uid}"]`,
                ) as HTMLButtonElement;
                if (btn) {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    btn.style.background = "rgba(46, 204, 113, 0.3)";
                    btn.style.borderColor = "#2ecc71";
                    btn.style.color = "#2ecc71";

                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.background = "";
                        btn.style.borderColor = "";
                        btn.style.color = "";
                    }, 1000);
                }
            }
        },
        [addToRegistry],
    );

    // Handle window close
    const handleClose = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.closeWindow();
        }
    }, []);

    // Handle open group window
    const handleOpenGroup = useCallback(() => {
        if (window.electronAPI) {
            window.electronAPI.openGroupWindow();
        }
    }, []);

    // Handle open history window
    const handleOpenHistory = useCallback(() => {
        if (window.electronAPI) {
            console.log("Opening history window...");
            window.electronAPI.openHistoryWindow();
        }
    }, []);

    // Auto-resize window to content
    useEffect(() => {
        const resizeWindowToContent = () => {
            if (!window.electronAPI?.resizeWindowToContent) return;

            requestAnimationFrame(() => {
                const dpsMeter = document.querySelector(".dps-meter");
                if (dpsMeter) {
                    const rect = dpsMeter.getBoundingClientRect();
                    const width = Math.ceil(rect.width);
                    const height = Math.ceil(rect.height);

                    if (
                        width >= 100 &&
                        height >= 50 &&
                        width <= 2000 &&
                        height <= 1500
                    ) {
                        window.electronAPI.resizeWindowToContent(
                            "main",
                            width,
                            height,
                        );
                    }
                }
            });
        };

        const interval = setInterval(resizeWindowToContent, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className={`dps-meter ${isLocked ? "locked" : ""}`}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            <ControlBar
                isLocked={isLocked}
                onToggleLock={toggleLock}
                onClose={handleClose}
                onDragStart={handleDragStart}
                viewMode={viewMode}
                onToggleViewMode={handleToggleViewMode}
                onToggleSkillsMode={handleToggleSkillsMode}
                sortColumn={sortColumn}
                onSortChange={handleSortChange}
                onSync={handleSync}
                isPaused={isPaused}
                onTogglePause={togglePause}
                currentLanguage={currentLanguage}
                onLanguageToggle={handleLanguageToggle}
                onOpenGroup={handleOpenGroup}
                onOpenHistory={handleOpenHistory}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                t={t}
            />

            {isLoading ? (
                <LoadingIndicator
                    message={t(
                        "ui.messages.waitingForData",
                        "Waiting for data...",
                    )}
                />
            ) : viewMode === "skills" && skillsData ? (
                <SkillsView
                    skillsData={skillsData}
                    startTime={startTime}
                    getPlayerName={getPlayerName}
                    translateProfession={translateProfession}
                    translateSkill={translateSkill}
                    t={t}
                />
            ) : (
                <PlayerList
                    players={players}
                    localUid={localUid}
                    onAddToRegistry={handleAddToRegistry}
                    getPlayerName={getPlayerName}
                    translateProfession={translateProfession}
                    t={t}
                />
            )}
        </div>
    );
}

export default MainApp;
