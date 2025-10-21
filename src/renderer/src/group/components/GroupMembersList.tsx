import React from "react";
import { getProfessionInfo } from "../../shared/utils/professions";
import type { AvailablePlayer } from "../hooks/useAvailablePlayers";
import type { PlayerRegistry } from "../../shared/types";

export interface GroupMembersListProps {
    members: string[];
    availablePlayers: AvailablePlayer[];
    playerRegistry: PlayerRegistry;
    onRemoveMember: (uuid: string) => void;
}

export function GroupMembersList({
    members,
    availablePlayers,
    playerRegistry,
    onRemoveMember,
}: GroupMembersListProps): React.JSX.Element {
    if (members.length === 0) {
        return (
            <div className="group-section">
                <h4>Group Members</h4>
                <div className="group-members-list">
                    <div className="empty-state">No members in group</div>
                </div>
            </div>
        );
    }

    return (
        <div className="group-section">
            <h4>Group Members</h4>
            <div id="group-members-list" className="group-members-list">
                {members.map((uuid) => {
                    // Find player in available players or use registry for name
                    const player = availablePlayers.find(
                        (p) => p.uuid === uuid,
                    );
                    const name =
                        player?.name || playerRegistry[uuid]?.name || "Unknown";
                    const profession = player?.profession || "Unknown";

                    // Get profession info - prefer sub-profession for icon if available
                    const professionParts = profession.split("-");
                    const mainProfessionKey = professionParts[0];
                    const subProfessionKey = professionParts[1];
                    const profInfo = subProfessionKey
                        ? getProfessionInfo(subProfessionKey)
                        : getProfessionInfo(mainProfessionKey);

                    return (
                        <div key={uuid} className="group-member-item">
                            <div className="player-info">
                                <span className="player-name">{name}</span>
                                <span className="player-uid">
                                    ({uuid.slice(0, 8)}...)
                                </span>
                                <span className="player-profession">
                                    {profInfo.name}
                                </span>
                            </div>
                            <button
                                className="btn-remove"
                                onClick={() => onRemoveMember(uuid)}
                                title="Remove from group"
                            >
                                Remove
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
