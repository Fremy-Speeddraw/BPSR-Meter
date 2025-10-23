import React from "react";
import { DevicePicker } from "./components/DevicePicker";
import DeviceControlBar from "./components/DeviceControlBar";
import { useWindowControls } from "../shared/hooks";

export default function DeviceApp(): React.JSX.Element {
    const { handleDragStart, handleClose } =
        useWindowControls({
            baseWidth: 480,
            baseHeight: 530,
            windowType: "device",
        });

    return (
        <div className="device-app">
            <DeviceControlBar title="Select Network Device" onDragStart={handleDragStart} onClose={handleClose} />
            <DevicePicker />
        </div>
    );
}
