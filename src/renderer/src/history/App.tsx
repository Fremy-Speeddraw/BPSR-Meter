import React, { useEffect, useCallback } from "react";
import { HistoryHeader, HistoryControls, HistoryList, HistoryDetails, SkillModal } from "./components";
import { useHistoryList, useHistoryDetails, useHistorySettings } from "./hooks";
import { useWindowControls } from "../shared/hooks";
import { usePlayerRegistry } from "../main/hooks/usePlayerRegistry";
import { useTranslations } from "../main/hooks/useTranslations";

export function HistoryApp(): React.JSX.Element {
    // Hooks
    const {
        historyItems,
        isLoading: isLoadingList,
        error: listError,
        refreshHistoryList,
    } = useHistoryList();

    const {
        selectedTimestamp,
        summary,
        userData,
        selectedPlayerSkills,
        isLoadingDetails,
        isLoadingSkills,
        detailsError,
        loadDetails,
        loadPlayerSkills,
        closeSkillModal,
    } = useHistoryDetails();

    const { isHistorySavingEnabled, toggleHistorySaving } =
        useHistorySettings();

    const { playerRegistry, getPlayerName, refreshRegistry } =
        usePlayerRegistry();

    const { translateSkill, translateProfession, t } = useTranslations();

    const { scale, isDragging, zoomIn, zoomOut, handleDragStart, handleClose } =
        useWindowControls({
            baseWidth: 1125,
            baseHeight: 875,
            windowType: "history",
        });

    // Load history list on mount
    useEffect(() => {
        refreshHistoryList();
    }, [refreshHistoryList]);

    // Refresh player registry periodically
    useEffect(() => {
        const interval = setInterval(refreshRegistry, 10000);
        return () => clearInterval(interval);
    }, [refreshRegistry]);

    // Handle history item selection
    const handleSelectItem = useCallback(
        async (timestamp: string) => {
            await loadDetails(timestamp);
        },
        [loadDetails],
    );

    // Handle view skills button
    const handleViewSkills = useCallback(
        async (timestamp: string, uid: string) => {
            await loadPlayerSkills(timestamp, uid);
        },
        [loadPlayerSkills],
    );

    // Handle refresh button
    const handleRefresh = useCallback(async () => {
        await refreshHistoryList();
    }, [refreshHistoryList]);

    // Auto-resize window to content
    useEffect(() => {
        const resizeWindowToContent = () => {
            if (!window.electronAPI?.resizeWindowToContent) return;

            requestAnimationFrame(() => {
                const historyWindow = document.querySelector(".history-window");
                if (historyWindow) {
                    const rect = historyWindow.getBoundingClientRect();
                    const width = Math.ceil(rect.width);
                    const height = Math.ceil(rect.height);

                    if (
                        width >= 100 &&
                        height >= 50 &&
                        width <= 2000 &&
                        height <= 1500
                    ) {
                        window.electronAPI.resizeWindowToContent(
                            "history",
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
        <div className="history-window">
            <HistoryHeader
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                t={t}
            />

            <div className="history-container">
                <div className="history-list-section">
                    <HistoryControls
                        isHistorySavingEnabled={isHistorySavingEnabled}
                        onRefresh={handleRefresh}
                        onToggleHistorySaving={toggleHistorySaving}
                        t={t}
                    />

                    <HistoryList
                        historyItems={historyItems}
                        isLoading={isLoadingList}
                        selectedTimestamp={selectedTimestamp}
                        onSelectItem={handleSelectItem}
                    />
                </div>

                <div className="history-details-section">
                    <HistoryDetails
                        summary={summary}
                        userData={userData}
                        isLoading={isLoadingDetails}
                        error={detailsError}
                        getPlayerName={getPlayerName}
                        translateProfession={translateProfession}
                        onViewSkills={handleViewSkills}
                        selectedTimestamp={selectedTimestamp}
                        t={t}
                    />
                </div>
            </div>

            <SkillModal
                playerSkills={selectedPlayerSkills}
                isLoading={isLoadingSkills}
                onClose={closeSkillModal}
                getPlayerName={getPlayerName}
                translateSkill={translateSkill}
                t={t}
            />
        </div>
    );
}

export default HistoryApp;
