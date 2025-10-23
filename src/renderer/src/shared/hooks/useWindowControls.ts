import { useState, useEffect, useCallback, useRef } from "react";

export interface UseWindowControlsOptions {
    baseWidth: number;
    baseHeight: number;
    windowType: "main" | "group" | "history" | "device";
}

export interface UseWindowControlsReturn {
    scale: number;
    isDragging: boolean;
    zoomIn: () => void;
    zoomOut: () => void;
    handleDragStart: (e: React.MouseEvent) => void;
    handleClose: () => void;
}

export function useWindowControls(
    options: UseWindowControlsOptions,
): UseWindowControlsReturn {
    const { baseWidth, baseHeight, windowType } = options;

    const [scale, setScale] = useState<number>(1);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const dragStateRef = useRef<{
        startX: number;
        startY: number;
        startWindowX: number;
        startWindowY: number;
    } | null>(null);

    // Load saved scale on mount
    useEffect(() => {
        const loadSavedScale = async () => {
            if (!window.electronAPI) return;

            try {
                const savedSizes =
                    await window.electronAPI.getSavedWindowSizes();
                const savedScale = savedSizes[windowType]?.scale;

                if (savedScale) {
                    setScale(savedScale);
                    document.documentElement.style.setProperty(
                        "--scale",
                        savedScale.toString(),
                    );
                    console.log(
                        `Loaded saved ${windowType} window scale: ${savedScale}`,
                    );
                }
            } catch (error) {
                console.warn(
                    `Failed to load saved ${windowType} window scale:`,
                    error,
                );
            }
        };

        loadSavedScale();
    }, [windowType]);

    // Apply scale to window
    const applyScale = useCallback(
        (newScale: number) => {
            if (!window.electronAPI) return;

            const clampedScale = Math.max(0.6, Math.min(1.8, newScale));
            setScale(clampedScale);

            // Update CSS variable
            document.documentElement.style.setProperty(
                "--scale",
                clampedScale.toString(),
            );

            // Calculate scaled dimensions
            const scaledWidth = Math.floor(baseWidth * clampedScale);
            const scaledHeight = Math.floor(baseHeight * clampedScale);

            // Resize window
            window.electronAPI.resizeWindowToContent(
                windowType,
                scaledWidth,
                scaledHeight,
            );

            // Save settings
            setTimeout(() => {
                window.electronAPI.saveWindowSize(
                    windowType,
                    scaledWidth,
                    scaledHeight,
                    clampedScale,
                );
            }, 100);
        },
        [baseWidth, baseHeight, windowType],
    );

    // Zoom controls
    const zoomIn = useCallback(() => {
        applyScale(scale + 0.1);
    }, [scale, applyScale]);

    const zoomOut = useCallback(() => {
        applyScale(scale - 0.1);
    }, [scale, applyScale]);

    // Window dragging
    const handleDragStart = useCallback(async (e: React.MouseEvent) => {
        if (!window.electronAPI) return;

        setIsDragging(true);

        const startX = e.screenX;
        const startY = e.screenY;
        const position = await window.electronAPI.getWindowPosition();

        dragStateRef.current = {
            startX,
            startY,
            startWindowX: position.x,
            startWindowY: position.y,
        };

        e.preventDefault();
    }, []);

    // Handle mouse move for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !window.electronAPI || !dragStateRef.current)
                return;

            const deltaX = e.screenX - dragStateRef.current.startX;
            const deltaY = e.screenY - dragStateRef.current.startY;
            const newX = dragStateRef.current.startWindowX + deltaX;
            const newY = dragStateRef.current.startWindowY + deltaY;

            window.electronAPI.setWindowPosition(newX, newY);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                dragStateRef.current = null;
                console.log("Drag ended");
            }
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    // Handle window close
    const handleClose = useCallback(() => {
        if (window.electronAPI) {
            window.close();
        }
    }, []);

    return {
        scale,
        isDragging,
        zoomIn,
        zoomOut,
        handleDragStart,
        handleClose,
    };
}
