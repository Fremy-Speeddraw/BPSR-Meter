import React from "react";

export interface GroupHeaderProps {
    onClose: () => void;
    onDragStart: (e: React.MouseEvent) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}

export function GroupHeader({
    onClose,
    onDragStart,
    onZoomIn,
    onZoomOut,
}: GroupHeaderProps): React.JSX.Element {
    return (
        <div className="group-header">
            {/* Drag Indicator */}
            <div
                id="group-drag-indicator"
                className="drag-indicator"
                onMouseDown={onDragStart}
                style={{ cursor: "move" }}
            >
                <i className="fa-solid fa-grip-vertical"></i>
            </div>

            {/* Window Title */}
            <span className="group-title">Group Management</span>

            {/* Spacer */}
            <div style={{ flex: 1 }}></div>

            {/* Zoom Controls */}
            <button
                id="group-zoom-out-btn"
                className="control-button"
                onClick={onZoomOut}
                title="Zoom out"
            >
                <i className="fa-solid fa-minus"></i>
            </button>
            <button
                id="group-zoom-in-btn"
                className="control-button"
                onClick={onZoomIn}
                title="Zoom in"
            >
                <i className="fa-solid fa-plus"></i>
            </button>

            {/* Close Button */}
            <button
                id="group-close-button"
                className="control-button"
                onClick={onClose}
                title="Close"
            >
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
}
