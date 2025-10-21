import React from "react";

export interface HistoryHeaderProps {
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}

export function HistoryHeader({
    onClose,
    onDragStart,
    onZoomIn,
    onZoomOut,
}: HistoryHeaderProps): React.JSX.Element {
    return (
        <div className="controls gap-1">
            {/* Drag Indicator */}
            <div
                id="drag-indicator"
                className="drag-indicator"
                onMouseDown={onDragStart}
                style={{ cursor: "grab" }}
            >
                <i className="fa-solid fa-grip-vertical"></i>
            </div>

            {/* Window Title */}
            <span
                style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                }}
            >
                Combat History
            </span>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* Zoom Controls */}
            <button
                id="history-zoom-out-btn"
                className="control-button"
                onClick={onZoomOut}
                title="Zoom out"
            >
                <i className="fa-solid fa-minus"></i>
            </button>
            <button
                id="history-zoom-in-btn"
                className="control-button"
                onClick={onZoomIn}
                title="Zoom in"
            >
                <i className="fa-solid fa-plus"></i>
            </button>

            {/* Close Button */}
            <button
                id="close-button"
                className="control-button"
                onClick={onClose}
                title="Close"
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
}
