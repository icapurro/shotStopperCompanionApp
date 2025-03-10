import React, { createContext, useContext } from 'react';
import { useDeviceSettings } from './useDeviceSettings';

interface DeviceSettingsContextType {
    settings: {
        autoTare: boolean;
        momentary: boolean;
        reedSwitch: boolean;
        minShotDuration: number;
        maxShotDuration: number;
        dripDelay: number;
    };
    isLoading: boolean;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    connectToDevice: () => void;
    updateAutoTare: (value: boolean) => void;
    updateMomentary: (value: boolean) => void;
    updateReedSwitch: (value: boolean) => void;
    updateMinShotDuration: (value: number) => void;
    updateMaxShotDuration: (value: number) => void;
    updateTimerValue: (value: number) => void;
    updateDripDelay: (value: number) => void;
    resetToDefaults: () => void;
}

const DeviceSettingsContext = createContext<DeviceSettingsContextType | null>(null);

export const DeviceSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const deviceSettings = useDeviceSettings(true);

    return (
        <DeviceSettingsContext.Provider value={deviceSettings}>
            {children}
        </DeviceSettingsContext.Provider>
    );
};

export const useDeviceSettingsContext = () => {
    const context = useContext(DeviceSettingsContext);
    if (!context) {
        throw new Error('useDeviceSettingsContext must be used within a DeviceSettingsProvider');
    }
    return context;
}; 