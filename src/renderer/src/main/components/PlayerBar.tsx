import React, { memo } from "react";
import { formatStat } from "../../shared/utils/formatters";
import { getProfessionInfo } from "../../shared/utils/professions";
import { getPositionBackgroundColor } from "../../shared/constants/colors";
import type { PlayerUser } from "../hooks/useDataFetching";

export interface PlayerBarProps {
    player: PlayerUser;
    position: number;
    isLocalPlayer: boolean;
    localUid: number | null;
    onAddToRegistry: (uid: string, name: string) => void;
    getPlayerName: (uid: string, currentName: string) => string;
    translateProfession: (profession: string) => string;
    t: (key: string, fallback?: string | null) => string;
}

function PlayerBarComponent({
    player,
    position,
    isLocalPlayer,
    onAddToRegistry,
    getPlayerName,
    translateProfession,
    t,
}: PlayerBarProps): React.JSX.Element {
    // Parse profession
    const professionParts = (player.profession || "-").split("-");
    const mainProfessionKey = professionParts[0];
    const subProfessionKey = professionParts[1];

    // Get profession info - prefer sub-profession for icon if available
    const prof = subProfessionKey
        ? getProfessionInfo(subProfessionKey)
        : getProfessionInfo(mainProfessionKey);

    const translatedMainProf = translateProfession(mainProfessionKey);
    const translatedSubProf = subProfessionKey
        ? translateProfession(subProfessionKey)
        : null;
    let professionName = translatedMainProf;
    if (translatedSubProf) {
        professionName += ` - ${translatedSubProf}`;
    }

    // Calculate stats
    const totalHits = player.total_count.total || 0;
    const crit =
        player.total_count.critical !== undefined && totalHits > 0
            ? Math.round((player.total_count.critical / totalHits) * 100)
            : 0;
    const lucky =
        player.total_count.lucky !== undefined && totalHits > 0
            ? Math.round((player.total_count.lucky / totalHits) * 100)
            : 0;
    const peak =
        player.realtime_dps_max !== undefined ? player.realtime_dps_max : 0;
    const dps = Number(player.total_dps) || 0;
    const totalHealing = player.total_healing
        ? Number(player.total_healing.total) || 0
        : 0;
    const name = getPlayerName(String(player.uid), player.name);
    const hpPercent = ((player.hp || 0) / (player.max_hp || 1)) * 100;
    const hpColor =
        hpPercent > 50 ? "#1db954" : hpPercent > 25 ? "#f39c12" : "#e74c3c";
    const bgColor = getPositionBackgroundColor(position - 1);

    // Position classes
    let positionClasses = "player-position";
    if (position === 1) positionClasses += " rank-1";
    else if (position === 2) positionClasses += " rank-2";
    else if (position === 3) positionClasses += " rank-3";
    if (isLocalPlayer) positionClasses += " local-player";

    // Calculate crit damage values
    const critDmg =
        (player.total_damage.critical || 0) +
        (player.total_damage.crit_lucky || 0);
    const critCount =
        player.total_count.critical + player.total_count.crit_lucky;
    const avgCritDmg = critCount > 0 ? critDmg / critCount : 0;

    return (
        <div
            className="player-bar"
            data-uid={player.uid}
            data-name={name}
            style={{
                ["--damage-percent" as string]: `${player.damagePercent}%`,
                ["--damage-bg-color" as string]: bgColor,
            }}
        >
            <div className="player-info">
                <span className={positionClasses}>{position}</span>

                <button
                    className="add-to-registry-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToRegistry(String(player.uid), name);
                    }}
                    title="Add to Player Registry"
                >
                    <i className="fa-solid fa-plus"></i>
                </button>

                <img
                    className="class-icon"
                    src={`icons/${prof.icon}`}
                    alt={professionName}
                    title={professionName}
                />

                <div className="player-details">
                    <span className="player-name">
                        {name}{" "}
                        <span
                            style={{
                                color: "var(--text-secondary)",
                                fontSize: "9px",
                                fontWeight: 400,
                            }}
                        >
                            ({t("ui.stats.gs")}: {player.fightPoint})
                        </span>
                    </span>
                    <div className="hp-bar">
                        <div
                            className="hp-fill"
                            style={{
                                width: `${hpPercent}%`,
                                background: hpColor,
                            }}
                        ></div>
                        <span className="hp-text">
                            {formatStat(player.hp || 0)}/
                            {formatStat(player.max_hp || 0)}
                        </span>
                    </div>
                </div>

                <div className="player-stats-main">
                    <div className="stat">
                        <span className="stat-label">{t("ui.stats.dps")}</span>
                        <span className="stat-value">{formatStat(dps)}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">{t("ui.stats.hps")}</span>
                        <span className="stat-value">
                            {formatStat(player.total_hps || 0)}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.totalDmg")}
                        </span>
                        <span className="stat-value">
                            {formatStat(
                                (player.total_damage &&
                                    player.total_damage.total) ||
                                    0,
                            )}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.dmgTaken")}
                        </span>
                        <span className="stat-value">
                            {formatStat(player.taken_damage || 0)}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.percentDmg")}
                        </span>
                        <span className="stat-value">
                            {Math.round(player.damagePercent || 0)}%
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.critPercent")}
                        </span>
                        <span className="stat-value">{crit}%</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.critDmg")}
                        </span>
                        <span className="stat-value">
                            {formatStat(critDmg)}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.avgCritDmg")}
                        </span>
                        <span className="stat-value">
                            {formatStat(avgCritDmg)}
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.luckyPercent")}
                        </span>
                        <span className="stat-value">{lucky}%</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.peakDps")}
                        </span>
                        <span className="stat-value">{formatStat(peak)}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">
                            {t("ui.stats.totalHeal")}
                        </span>
                        <span className="stat-value">
                            {formatStat(totalHealing)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Memoize to prevent unnecessary re-renders
export const PlayerBar = memo(PlayerBarComponent, (prevProps, nextProps) => {
    // Only re-render if relevant props have changed
    return (
        prevProps.player.uid === nextProps.player.uid &&
        prevProps.player.total_damage.total ===
            nextProps.player.total_damage.total &&
        prevProps.player.hp === nextProps.player.hp &&
        prevProps.player.total_dps === nextProps.player.total_dps &&
        prevProps.player.damagePercent === nextProps.player.damagePercent &&
        prevProps.position === nextProps.position &&
        prevProps.isLocalPlayer === nextProps.isLocalPlayer &&
        prevProps.player.name === nextProps.player.name
    );
});

PlayerBar.displayName = "PlayerBar";
