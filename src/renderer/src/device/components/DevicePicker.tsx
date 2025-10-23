import React, { useEffect, useState } from "react";

export function DevicePicker(): React.JSX.Element {
    const [devices, setDevices] = useState<any[]>([]);
    const [selected, setSelected] = useState<string | number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const resp = await fetch("/api/devices");
                const json = await resp.json();
                if (mounted && json && json.code === 0) {
                    setDevices(json.data || []);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to load devices", err);
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch("/api/device");
                const json = await resp.json();
                if (json && json.code === 0 && json.data) {
                    setSelected(json.data.selectedDevice ?? null);
                }
            } catch (err) {
                // ignore
            }
        })();
    }, []);

    const handleSave = async (device: number) => {
        setSaving(true);
        try {
            setSelected(device);
            const resp = await fetch("/api/device", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedDevice: device }),
            });
            const json = await resp.json();
            if (json && json.code === 0) {
            }
        } catch (err) {
            console.error("Failed to save device selection", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {loading ? (
                <div>Loading devices...</div>
            ) : (
                <div className="device-list">
                    {devices.length === 0 && <div className="device-no-devices">No devices found. Ensure Npcap is installed.</div>}
                    {devices.map((d) => (
                        <label key={d.id} className="device-item" onClick={() => handleSave(d.id)}>
                            <input type="radio" name="device" checked={String(selected) === String(d.id)} onChange={() => handleSave(d.id)} />
                            <div className="device-meta">
                                <div className="device-name">{d.description || d.name}</div>
                                <div className="device-desc">{d.name}</div>
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
