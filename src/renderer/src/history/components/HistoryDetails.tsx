import React from "react";
import {
    formatDuration,
    formatDate,
    formatStat,
} from "../../shared/utils/formatters";
import type { HistorySummary, HistoryUserData } from "../types";

export interface HistoryDetailsProps {
    summary: HistorySummary | null;
    userData: HistoryUserData | null;
    isLoading: boolean;
    error: string | null;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    onViewSkills: (timestamp: string, uid: string) => void;
    selectedTimestamp: string | null;
}

export function HistoryDetails({
    summary,
    userData,
    isLoading,
    error,
    getPlayerName,
    translateProfession,
    onViewSkills,
    selectedTimestamp,
}: HistoryDetailsProps): React.JSX.Element {
    if (isLoading) {
        return (
            <div className="history-details">
                <div className="loading-indicator">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Loading details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="history-details">
                <div className="empty-state error">
                    <i
                        className="fa-solid fa-exclamation-triangle"
                        style={{
                            fontSize: "32px",
                            color: "#ff6b7a",
                            marginBottom: "12px",
                        }}
                    ></i>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!summary || !userData) {
        return (
            <div className="history-details">
                <div className="empty-state">
                    <i
                        className="fa-solid fa-chart-line"
                        style={{
                            fontSize: "32px",
                            opacity: 0.3,
                            marginBottom: "12px",
                        }}
                    ></i>
                    <p>Select a combat session from the list</p>
                </div>
            </div>
        );
    }

    // Sort users by damage
    const sortedUsers = Object.entries(userData).sort(
        (a, b) => b[1].total_damage.total - a[1].total_damage.total,
    );

    // Calculate total damage
    const totalDamage = sortedUsers.reduce(
        (sum, [, user]) => sum + user.total_damage.total,
        0,
    );

    return (
        <div className="history-details">
            <div className="history-details-header">
                <h4>Combat Session</h4>
                <div className="history-details-meta">
                    <div className="meta-item">
                        <i className="fa-solid fa-calendar"></i>
                        <span>{formatDate(summary.startTime)}</span>
                    </div>
                    <div className="meta-item">
                        <i className="fa-solid fa-hourglass-half"></i>
                        <span>{formatDuration(summary.duration)}</span>
                    </div>
                    <div className="meta-item">
                        <i className="fa-solid fa-users"></i>
                        <span>{summary.userCount} players</span>
                    </div>
                </div>
            </div>

            <div className="history-player-list">
                {sortedUsers.map(([uid, user], index) => {
                    const percentage =
                        totalDamage > 0
                            ? (user.total_damage.total / totalDamage) * 100
                            : 0;
                    const rank = index + 1;
                    const playerName = getPlayerName(uid, user.name);

                    // Translate profession
                    const professionParts = (user.profession || "").split("-");
                    const mainProf = professionParts[0];
                    const subProf = professionParts[1];
                    const translatedMainProf = translateProfession(mainProf);
                    const translatedSubProf = subProf
                        ? translateProfession(subProf)
                        : null;
                    const displayProfession =
                        translatedSubProf || translatedMainProf;

                    return (
                        <div key={uid} className="history-player-item">
                            <div className="player-rank">#{rank}</div>
                            <div className="player-info">
                                <div className="player-name">{playerName}</div>
                                <div className="player-profession">
                                    {displayProfession}
                                </div>
                            </div>
                            <div className="player-stats">
                                <div className="player-stat">
                                    <span className="stat-label">Damage</span>
                                    <span className="stat-value">
                                        {formatStat(user.total_damage.total)}
                                    </span>
                                </div>
                                <div className="player-stat">
                                    <span className="stat-label">DPS</span>
                                    <span className="stat-value">
                                        {formatStat(user.total_dps)}
                                    </span>
                                </div>
                                <div className="player-stat">
                                    <span className="stat-label">Hits</span>
                                    <span className="stat-value">
                                        {formatStat(user.total_count.total)}
                                    </span>
                                </div>
                                <div className="player-stat">
                                    <span className="stat-label">Heals</span>
                                    <span className="stat-value">
                                        {formatStat(user.total_healing.total)}
                                    </span>
                                </div>
                                <div className="player-stat">
                                    <span className="stat-label">Share</span>
                                    <span className="stat-value">
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <button
                                className="view-skills-btn"
                                onClick={() =>
                                    selectedTimestamp &&
                                    onViewSkills(selectedTimestamp, uid)
                                }
                                title="View skill breakdown"
                            >
                                <i className="fa-solid fa-chart-bar"></i>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
