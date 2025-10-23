import React, { useCallback, useEffect } from "react";
import {
    GroupHeader,
    GroupToggle,
    GroupMembersList,
    AvailablePlayers,
    PlayerRegistrySection,
    ClearGroupButton,
} from "./components";
import { useGroupState, useAvailablePlayers } from "./hooks";
import { useWindowControls } from "../shared/hooks";
import { usePlayerRegistry } from "../main/hooks/usePlayerRegistry";
import { useTranslations } from "../main/hooks/useTranslations";

export function GroupApp(): React.JSX.Element {
    // Hooks
    const {
        groupState,
        toggleGroupEnabled,
        addMember,
        removeMember,
        clearGroup,
    } = useGroupState();

    const { playerRegistry, addToRegistry, refreshRegistry } =
        usePlayerRegistry();

    const { t } = useTranslations();

    const { availablePlayers, isLoading, refreshPlayers } =
        useAvailablePlayers(playerRegistry);

    const { scale, isDragging, zoomIn, zoomOut, handleDragStart, handleClose } =
        useWindowControls({
            baseWidth: 480,
            baseHeight: 530,
            windowType: "group",
        });

    // Handle add player to group
    const handleAddPlayer = useCallback(
        async (uuid: string) => {
            await addMember(uuid);
        },
        [addMember],
    );

    // Handle remove player from group
    const handleRemoveMember = useCallback(
        async (uuid: string) => {
            await removeMember(uuid);
        },
        [removeMember],
    );

    // Handle clear group with confirmation
    const handleClearGroup = useCallback(async () => {
        await clearGroup();
    }, [clearGroup]);

    // Handle save player to registry
    const handleSaveToRegistry = useCallback(
        async (uid: string, name: string) => {
            const success = await addToRegistry(uid, name);
            if (success) {
                console.log(`Player ${name} (${uid}) saved to registry`);
            }
        },
        [addToRegistry],
    );

    // Handle delete player from registry
    const handleDeleteFromRegistry = useCallback(
        async (uid: string) => {
            try {
                const response = await fetch("/api/player-registry/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid }),
                });

                const result = await response.json();
                if (result.code === 0) {
                    console.log(`Deleted player from registry: ${uid}`);
                    await refreshRegistry();
                }
            } catch (error) {
                console.error("Failed to delete player from registry:", error);
            }
        },
        [refreshRegistry],
    );

    useEffect(() => {
        if (!window.electronAPI?.resizeWindowToContent) return;
        let debounceTimer: number | null = null;

        const resizeIfNeeded = (width: number, height: number) => {
            if (
                width >= 100 &&
                height >= 50 &&
                width <= 2000 &&
                height <= 1500
            ) {
                window.electronAPI.resizeWindowToContent("group", width, height);
            }
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const cr = (entry as any).contentRect as DOMRectReadOnly;
            if (debounceTimer) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                resizeIfNeeded(Math.ceil(cr.width), Math.ceil(cr.height));
                debounceTimer = null;
            }, 80);
        });

        const el = document.querySelector(".group-meter");
        if (el) observer.observe(el);

        return () => {
            if (debounceTimer) window.clearTimeout(debounceTimer);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="group-meter">
            <GroupHeader
                onClose={handleClose}
                onDragStart={handleDragStart}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
                t={t}
            />

            <div className="group-window">
                <GroupToggle
                    enabled={groupState.enabled}
                    memberCount={groupState.members.length}
                    onToggle={toggleGroupEnabled}
                    t={t}
                />

                <ClearGroupButton
                    onClearGroup={handleClearGroup}
                    disabled={groupState.members.length === 0}
                    t={t}
                />

                <GroupMembersList
                    members={groupState.members}
                    availablePlayers={availablePlayers}
                    playerRegistry={playerRegistry}
                    onRemoveMember={handleRemoveMember}
                    t={t}
                />

                <AvailablePlayers
                    players={availablePlayers}
                    groupMembers={groupState.members}
                    onAddPlayer={handleAddPlayer}
                    t={t}
                />

                <PlayerRegistrySection
                    playerRegistry={playerRegistry}
                    onSavePlayer={handleSaveToRegistry}
                    onDeletePlayer={handleDeleteFromRegistry}
                    t={t}
                />
            </div>
        </div>
    );
}

export default GroupApp;
