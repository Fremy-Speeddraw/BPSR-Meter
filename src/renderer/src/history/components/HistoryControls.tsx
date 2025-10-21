import React from "react";

export interface HistoryControlsProps {
    isHistorySavingEnabled: boolean;
    onRefresh: () => void;
    onToggleHistorySaving: () => void;
}

export function HistoryControls({
    isHistorySavingEnabled,
    onRefresh,
    onToggleHistorySaving,
}: HistoryControlsProps): React.JSX.Element {
    return (
        <div className="history-header">
            <button
                id="refresh-history-btn"
                className="control-button"
                onClick={onRefresh}
                title="Refresh history list"
                style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 600,
                }}
            >
                <i
                    className="fa-solid fa-rotate-right"
                    style={{ marginRight: "6px" }}
                ></i>
                Refresh
            </button>

            <button
                id="enable-history-btn"
                className={`control-button ${isHistorySavingEnabled ? "enabled" : ""}`}
                onClick={onToggleHistorySaving}
                title={
                    isHistorySavingEnabled
                        ? "Disable history saving"
                        : "Enable history saving"
                }
                style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 600,
                }}
            >
                <i
                    className={`fa-solid fa-toggle-${isHistorySavingEnabled ? "on" : "off"}`}
                    style={{ marginRight: "6px" }}
                ></i>
                {isHistorySavingEnabled ? "Saving Enabled" : "Enable Saving"}
            </button>
        </div>
    );
}
