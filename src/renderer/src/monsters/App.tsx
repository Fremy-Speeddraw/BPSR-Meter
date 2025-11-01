import React, { useEffect, useState } from "react";
import type { ApiResponse } from "../shared/types";
import { t } from "../shared/utils/translations";
import { translateForLang } from "../shared/utils/translations";
import { useWindowControls } from "../shared/hooks";
import MonstersHeader from "./MonstersHeader";
import SortDropdown from "./SortDropdown";

interface MonsterEntry {
    name?: string | null;
    hp?: number | null;
    max_hp?: number | null;
}

export default function MonstersApp(): React.JSX.Element {
    const [monsters, setMonsters] = useState<Record<string, MonsterEntry>>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<"id" | "name" | "hp">("hp");
    const [sortDesc, setSortDesc] = useState<boolean>(true);
    // local cache of Chinese translations for monster ids
    const [zhNames, setZhNames] = useState<Record<number, string>>({});

    const { scale, zoomIn, zoomOut, handleDragStart, handleClose } = useWindowControls({
        baseWidth: 560,
        baseHeight: 420,
        windowType: "monsters",
    });

    useEffect(() => {
        let mounted = true;

        const fetchEnemies = async () => {
            try {
                const resp = await fetch("/api/enemies");
                const data: ApiResponse = await resp.json();
                if (mounted) {
                    // @ts-ignore
                    if (data && data.enemy) {
                        // @ts-ignore
                        const incoming: Record<string, MonsterEntry> = data.enemy || {};

                        const filtered = Object.fromEntries(
                            Object.entries(incoming).filter(([_id, entry]) => {
                                if (!entry) return false;
                                const hp = entry.hp;
                                if (typeof hp !== "number") return true;
                                // keep monsters even if hp === 0
                                return hp >= 0;
                            }),
                        ) as Record<string, MonsterEntry>;
                        setMonsters(filtered);

                        // Prefetch Chinese translations for entries missing names
                        (async () => {
                            try {
                                const missingIds = new Set<number>();
                                for (const [id, entry] of Object.entries(filtered)) {
                                    const mid = (entry as any).monster_id;
                                    const hasName = entry && entry.name && entry.name !== "Unknown";
                                    if (!hasName && mid) missingIds.add(Number(mid));
                                }
                                if (missingIds.size === 0) return;

                                const newZh: Record<number, string> = {};
                                for (const mid of missingIds) {
                                    const key = `monsters.${mid}`;
                                    const zh = await translateForLang("zh", key, null);
                                    if (zh) newZh[mid] = zh;
                                }
                                if (Object.keys(newZh).length > 0) {
                                    setZhNames((s) => ({ ...s, ...newZh }));
                                }
                            } catch (e) {
                                // silent
                            }
                        })();
                    } else {
                        setMonsters({});
                    }
                    setIsLoading(false);
                }
            } catch (err: any) {
                console.error("Failed to fetch enemies", err);
                if (mounted) setError(String(err));
            }
        };

        fetchEnemies();
        const iv = setInterval(fetchEnemies, 100);
        return () => {
            mounted = false;
            clearInterval(iv);
        };
    }, []);

    useEffect(() => {
        if (!window.electronAPI?.resizeWindowToContent) return;
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            window.electronAPI.resizeWindowToContent("monsters", width, height, scale);
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const cr = entry.target.getBoundingClientRect();
            if (debounceTimer) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                resizeIfNeeded(Math.ceil(cr.width), Math.ceil(cr.height));
                debounceTimer = null;
            }, 80);
        });

        const el = document.querySelector(".monsters-window");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="monsters-window pointer-events-auto">
            <MonstersHeader onClose={handleClose} onDragStart={handleDragStart} onZoomIn={zoomIn} onZoomOut={zoomOut} />
            {isLoading ? (
                <div>Loading...</div>
            ) : error ? (
                <div style={{ color: "#f88" }}>Error: {error}</div>
            ) : (
                <div className="monsters-container">
                    <div className="flex justify-between items-center mb-2 gap-2">
                        <div className="text-sm font-semibold">Monsters ({Object.keys(monsters).length})</div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs">Sort:</label>
                            {/* Styled dropdown matching DevicePicker */}
                            <div className="min-w-[140px]">
                                {/* lazy load custom dropdown */}
                                <SortDropdown value={sortKey} onChange={(v) => setSortKey(v as any)} />
                            </div>
                            <button onClick={() => setSortDesc((s) => !s)} className="p-1">{sortDesc ? "Desc" : "Asc"}</button>
                        </div>
                    </div>

                    <table className="monsters-table w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-1">ID</th>
                                <th className="text-left p-1">Name</th>
                                <th className="text-right p-1">HP</th>
                                <th className="text-right p-1">Max HP</th>
                                <th className="text-right p-1">HP %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(monsters)
                                .map(([id, m]) => ({ id, ...m }))
                                .sort((a, b) => {
                                    if (sortKey === "hp") {
                                        const ah = a.hp ?? -Infinity;
                                        const bh = b.hp ?? -Infinity;
                                        return sortDesc ? bh - ah : ah - bh;
                                    }
                                    if (sortKey === "name") {
                                        const an = (a.name || "").toString();
                                        const bn = (b.name || "").toString();
                                        return sortDesc ? bn.localeCompare(an) : an.localeCompare(bn);
                                    }
                                    // id
                                    const ai = Number(a.id);
                                    const bi = Number(b.id);
                                    return sortDesc ? bi - ai : ai - bi;
                                })
                                .map((m) => {
                                            // Prefer localized monster name when monster_id is provided.
                                            // The server now returns `monster_id` when available. Use
                                            // the translations system (loaded elsewhere in the app)
                                            // to resolve monsters.<id> into the user's language.
                                            let displayName: string;
                                            if (m?.name && m.name !== "Unknown") {
                                                displayName = (m as any).monster_id
                                                    ? t(`monsters.${(m as any).monster_id}`, m?.name ?? "Unknown")
                                                    : m.name;
                                            } else if ((m as any).monster_id && zhNames[(m as any).monster_id]) {
                                                displayName = zhNames[(m as any).monster_id];
                                            } else if ((m as any).monster_id) {
                                                // fallback to current-language translation (may be english) or raw name
                                                displayName = t(`monsters.${(m as any).monster_id}`, m?.name ?? "Unknown");
                                            } else {
                                                displayName = m?.name ?? "Unknown";
                                            }
                                            const pct = m.max_hp && m.hp ? Math.max(0, Math.min(1, (m.hp / m.max_hp))) : null;
                                    return (
                                        <tr key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                            <td style={{ padding: 6 }}>{m.id}</td>
                                                    <td style={{ padding: 6 }}>{displayName}</td>
                                            <td style={{ padding: 6, textAlign: "right" }}>{m?.hp ?? "-"}</td>
                                            <td style={{ padding: 6, textAlign: "right" }}>{m?.max_hp ?? "-"}</td>
                                            <td style={{ padding: 6, textAlign: "right", width: 160 }}>
                                                {pct === null ? (
                                                    "-"
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", height: 10, borderRadius: 6, overflow: "hidden" }}>
                                                            <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: pct > 0.6 ? "#2ecc71" : pct > 0.3 ? "#f1c40f" : "#e74c3c" }} />
                                                        </div>
                                                        <div style={{ minWidth: 48, textAlign: "right", fontSize: 12 }}>{Math.round(pct * 100)}%</div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                    {Object.keys(monsters).length === 0 && <div style={{ marginTop: 8 }}>No monsters found.</div>}
                </div>
            )}
        </div>
    );
}
