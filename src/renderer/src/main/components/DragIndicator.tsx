import React from "react";

export interface DragIndicatorProps {
    onDragStart: (e: React.MouseEvent) => void;
    isLocked: boolean;
}

export function DragIndicator({
    onDragStart,
    isLocked,
}: DragIndicatorProps): React.JSX.Element {
    return (
        <div
            id="drag-indicator"
            className="drag-indicator"
            onMouseDown={isLocked ? undefined : onDragStart}
            style={{
                cursor: isLocked ? "not-allowed" : "move",
                opacity: isLocked ? 0.3 : 1,
                pointerEvents: isLocked ? "none" : "auto",
            }}
        >
            <i className="fa-solid fa-grip-vertical"></i>
        </div>
    );
}
