import React from "react";

export interface HistoryControlsProps {
    isHistorySavingEnabled: boolean;
    onRefresh: () => void;
    onToggleHistorySaving: () => void;
    t: (key: string, fallback?: string | null) => string;
}

export function HistoryControls({
    isHistorySavingEnabled,
    onRefresh,
    onToggleHistorySaving,
    t,
}: HistoryControlsProps): React.JSX.Element {
    return (
        <div className="history-header">
            <button
                id="refresh-history-btn"
                className="control-button"
                onClick={onRefresh}
                title={t("ui.buttons.refreshHistory")}
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
                {t("ui.buttons.refreshHistory")}
            </button>

            <button
                id="enable-history-btn"
                className={`control-button ${isHistorySavingEnabled ? "enabled" : ""}`}
                onClick={onToggleHistorySaving}
                title={
                    isHistorySavingEnabled
                        ? t("ui.buttons.disableHistorySaving")
                        : t("ui.buttons.enableHistorySaving")
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
                {isHistorySavingEnabled ? t("ui.messages.savingEnabled") : t("ui.buttons.enableSaving")}
            </button>
        </div>
    );
}
