import React from "react";
import { getProfessionInfo } from "../../shared/utils/professions";
import type { AvailablePlayer } from "../hooks/useAvailablePlayers";

export interface AvailablePlayersProps {
    players: AvailablePlayer[];
    groupMembers: string[];
    onAddPlayer: (uuid: string) => void;
}

export function AvailablePlayers({
    players,
    groupMembers,
    onAddPlayer,
}: AvailablePlayersProps): React.JSX.Element {
    // Filter out players already in group
    const nonGroupPlayers = players.filter(
        (p) => p.uuid && !groupMembers.includes(p.uuid),
    );

    return (
        <div className="group-section">
            <h4>Available Players</h4>
            <div id="available-players-list" className="available-players-list">
                {nonGroupPlayers.length === 0 ? (
                    <div className="empty-state">No available players</div>
                ) : (
                    nonGroupPlayers.map((player) => {
                        if (!player.uuid) return null;

                        // Get profession info - prefer sub-profession for icon if available
                        const professionParts = (
                            player.profession || "Unknown"
                        ).split("-");
                        const mainProfessionKey = professionParts[0];
                        const subProfessionKey = professionParts[1];
                        const profInfo = subProfessionKey
                            ? getProfessionInfo(subProfessionKey)
                            : getProfessionInfo(mainProfessionKey);

                        return (
                            <div
                                key={player.uuid}
                                className="available-player-item"
                                onClick={() => onAddPlayer(player.uuid)}
                                style={{ cursor: "pointer" }}
                                title="Click to add to group"
                            >
                                <div className="player-info">
                                    <span className="player-name">
                                        {player.name}
                                    </span>
                                    <span className="player-uid">
                                        ({player.uuid.slice(0, 8)}...)
                                    </span>
                                    <span className="player-profession">
                                        {profInfo.name}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
