import React from "react";

export interface GroupToggleProps {
    enabled: boolean;
    memberCount: number;
    onToggle: () => void;
}

export function GroupToggle({
    enabled,
    memberCount,
    onToggle,
}: GroupToggleProps): React.JSX.Element {
    return (
        <div className="group-toggle">
            <label>
                <input
                    id="group-enabled-toggle"
                    type="checkbox"
                    checked={enabled}
                    onChange={onToggle}
                />
                <span>Enable Group Filter</span>
            </label>
            <div className="group-info">
                <p id="group-member-count">
                    Current group members: <strong>{memberCount}</strong>
                </p>
            </div>
        </div>
    );
}
