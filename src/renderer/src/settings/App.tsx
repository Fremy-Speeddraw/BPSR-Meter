import React, { useEffect, useState } from "react";
import "/css/style.css";
import { useWindowControls } from "../shared/hooks";
import { useTranslations } from "../shared/hooks/useTranslations";

const DEFAULT_KEYS = [
    "dps",
    "hps",
    "totalDmg",
    "dmgTaken",
    "percentDmg",
    "critPercent",
    "critDmg",
    "avgCritDmg",
    "luckyPercent",
    "peakDps",
    "totalHeal",
];

export default function SettingsApp(): React.JSX.Element {
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const k of DEFAULT_KEYS) initial[k] = true;
        return initial;
    });

    const { t } = useTranslations();

    const { zoomIn, zoomOut, handleDragStart, handleClose } = useWindowControls({
        baseWidth: 360,
        baseHeight: 520,
        windowType: "settings",
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem("visibleColumns");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    setVisibleColumns((prev) => ({ ...prev, ...parsed }));
                }
            }
        } catch (err) {
            console.warn("Failed to load visibleColumns from localStorage", err);
        }
    }, []);

    const toggle = (key: string) => {
        const next = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(next);
        try {
            localStorage.setItem("visibleColumns", JSON.stringify(next));
        } catch (e) {
            console.warn("Failed to persist visibleColumns to localStorage", e);
        }

        try {
            window.electronAPI.updateVisibleColumns(next);
        } catch (err) {
            console.warn("Failed to notify main window of visibleColumns change", err);
        }
    };

    return (
        <div className="settings-window p-4">
            <div className="settings-header">
                <div className="drag-indicator pointer-events-auto" onMouseDown={handleDragStart} style={{ cursor: "move" }}>
                    <i className="fa-solid fa-grip-vertical"></i>
                </div>
                <span className="group-title">{t("ui.titles.settings")}</span>
                <div style={{ flex: 1 }} />
                <button id="settings-zoom-out" className="control-button" onClick={zoomOut} title={t("ui.buttons.zoomOut")}>
                    <i className="fa-solid fa-minus"></i>
                </button>
                <button id="settings-zoom-in" className="control-button" onClick={zoomIn} title={t("ui.buttons.zoomIn")}>
                    <i className="fa-solid fa-plus"></i>
                </button>
                <button id="settings-close" className="control-button" onClick={handleClose} title={t("ui.buttons.close")}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div className="settings-container">
                <div className="settings-columns mt-3">
                    {DEFAULT_KEYS.map((k) => (
                        <label key={k} className="column-item settings-row">
                            <input
                                type="checkbox"
                                checked={!!visibleColumns[k]}
                                onChange={() => toggle(k)}
                            />
                            <span className="fake-checkbox" aria-hidden></span>
                            <span className="column-label">{t(`ui.stats.${k}`)}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
