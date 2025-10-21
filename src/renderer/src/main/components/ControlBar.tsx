import React from "react";
import { DragIndicator } from "./DragIndicator";
import type { ViewMode, SortColumn } from "../../shared/types";

export interface ControlBarProps {
    // Window controls
    isLocked: boolean;
    onToggleLock: () => void;
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;

    // View mode controls
    viewMode: ViewMode;
    onToggleViewMode: () => void;
    onToggleSkillsMode: () => void;

    // Sorting controls
    sortColumn: SortColumn;
    onSortChange: (column: SortColumn) => void;

    // Action controls
    onSync: () => void;
    isPaused: boolean;
    onTogglePause: () => void;

    // Language control
    currentLanguage: string;
    onLanguageToggle: () => void;

    // Window controls
    onOpenGroup: () => void;
    onOpenHistory: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;

    // Translations
    t: (key: string, fallback?: string | null) => string;
}

export function ControlBar({
    isLocked,
    onToggleLock,
    onClose,
    onDragStart,
    viewMode,
    onToggleViewMode,
    onToggleSkillsMode,
    sortColumn,
    onSortChange,
    onSync,
    isPaused,
    onTogglePause,
    currentLanguage,
    onLanguageToggle,
    onOpenGroup,
    onOpenHistory,
    onZoomIn,
    onZoomOut,
    t,
}: ControlBarProps): React.JSX.Element {
    const showSortButtons = viewMode !== "solo" && viewMode !== "skills";
    const showNearbyButton = viewMode !== "skills";

    return (
        <div className="controls gap-1">
            {/* Drag Indicator */}
            <DragIndicator onDragStart={onDragStart} isLocked={isLocked} />

            {/* Sync/Reset Button */}
            <button
                id="sync-button"
                className="sync-button"
                onClick={onSync}
                title="Reset statistics"
            >
                <i className="fa-solid fa-rotate-right sync-icon"></i>
            </button>

            {/* Pause Button */}
            <button
                id="pause-button"
                className="control-button"
                onClick={onTogglePause}
                title={isPaused ? "Resume updates" : "Pause updates"}
            >
                <i className={`fa-solid fa-${isPaused ? "play" : "pause"}`}></i>
            </button>

            {/* Group Button */}
            <button
                id="group-btn"
                className="control-button advanced-lite-btn group"
                onClick={onOpenGroup}
                title="Open group management"
            >
                <i className="fa-solid fa-users"></i>
            </button>

            {/* History Button */}
            <button
                id="history-btn"
                className="control-button advanced-lite-btn"
                onClick={onOpenHistory}
                title="Open combat history"
            >
                <i className="fa-solid fa-clock-rotate-left"></i>
            </button>

            {/* Nearby/Solo Toggle */}
            {showNearbyButton && (
                <button
                    id="nearby-group-btn"
                    className={`control-button advanced-lite-btn ${viewMode === "solo" ? "solo" : ""}`}
                    onClick={onToggleViewMode}
                    title={
                        viewMode === "nearby"
                            ? "Switch to Solo mode"
                            : "Switch to Nearby mode"
                    }
                >
                    {viewMode === "nearby" ? "Nearby" : "Solo"}
                </button>
            )}

            <div className="flex gap-1 mx-auto">
                {/* Skills View Toggle */}
                <button
                    id="skills-btn"
                    className={`control-button advanced-lite-btn ${viewMode === "skills" ? "active" : ""}`}
                    onClick={onToggleSkillsMode}
                    title="Toggle skills breakdown view"
                >
                    <i className="fa-solid fa-chart-line mr-2"></i> Skills
                </button>
                {/* Sort Buttons - only show in nearby mode */}
                {showSortButtons && (
                    <>
                        <button
                            id="sort-dmg-btn"
                            className={`sort-button ${sortColumn === "totalDmg" ? "active" : ""}`}
                            onClick={() => onSortChange("totalDmg")}
                            title="Sort by damage"
                        >
                            DMG
                        </button>
                        <button
                            id="sort-tank-btn"
                            className={`sort-button ${sortColumn === "totalDmgTaken" ? "active" : ""}`}
                            onClick={() => onSortChange("totalDmgTaken")}
                            title="Sort by damage taken"
                        >
                            Tank
                        </button>
                        <button
                            id="sort-heal-btn"
                            className={`sort-button ${sortColumn === "totalHeal" ? "active" : ""}`}
                            onClick={() => onSortChange("totalHeal")}
                            title="Sort by healing"
                        >
                            Heal
                        </button>
                    </>
                )}
            </div>

            {/* Zoom Controls */}
            <div className="flex ml-auto gap-1">
                <button
                    id="zoom-out-btn"
                    className="control-button"
                    onClick={onZoomOut}
                    title="Zoom out"
                    disabled={isLocked}
                    style={{
                        opacity: isLocked ? 0.3 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                    }}
                >
                    <i className="fa-solid fa-minus"></i>
                </button>
                <button
                    id="zoom-in-btn"
                    className="control-button"
                    onClick={onZoomIn}
                    title="Zoom in"
                    disabled={isLocked}
                    style={{
                        opacity: isLocked ? 0.3 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                    }}
                >
                    <i className="fa-solid fa-plus"></i>
                </button>
            </div>

            <div className="flex gap-1 ml-2">
                {/* Language Toggle */}
                <button
                    id="language-btn"
                    className="control-button"
                    onClick={onLanguageToggle}
                    title={
                        currentLanguage === "en"
                            ? "Switch to Chinese"
                            : "Switch to English"
                    }
                >
                    <span style={{ fontSize: "10px", fontWeight: 600 }}>
                        {currentLanguage === "en" ? "EN" : "中"}
                    </span>
                </button>

                {/* Lock Button */}
                <button
                    id="lock-button"
                    className="control-button"
                    onClick={onToggleLock}
                    title={isLocked ? "Unlock position" : "Lock position"}
                >
                    <i
                        className={`fa-solid fa-${isLocked ? "lock" : "lock-open"}`}
                    ></i>
                </button>

                {/* Close Button */}
                <button
                    id="close-button"
                    className="control-button"
                    onClick={onClose}
                    title="Close"
                    style={{
                        opacity: isLocked ? 0.3 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        pointerEvents: isLocked ? "none" : "auto",
                    }}
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    );
}
