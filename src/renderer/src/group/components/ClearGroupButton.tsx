import React from "react";

export interface ClearGroupButtonProps {
    onClearGroup: () => void;
    disabled?: boolean;
}

export function ClearGroupButton({
    onClearGroup,
    disabled = false,
}: ClearGroupButtonProps): React.JSX.Element {
    const handleClick = () => {
        if (
            window.confirm("Are you sure you want to remove all group members?")
        ) {
            onClearGroup();
        }
    };

    return (
        <div className="group-actions">
            <button
                id="clear-group-btn"
                className="btn-clear-group"
                onClick={handleClick}
                disabled={disabled}
                style={{
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                }}
            >
                <i
                    className="fa-solid fa-trash-can"
                    style={{ marginRight: "6px" }}
                ></i>
                Clear Group
            </button>
        </div>
    );
}
