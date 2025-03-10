import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BleManager from 'react-native-ble-manager';

interface DeviceSettings {
    autoTare: boolean;
    momentary: boolean;
    reedSwitch: boolean;
    minShotDuration: number;
    maxShotDuration: number;
    dripDelay: number;
    weightValue: number;
}

interface PeripheralConfig {
    deviceId: string;
    serviceUUID: string;
    characteristics: {
        [key: string]: string;
    };
}

const DEFAULT_SETTINGS: DeviceSettings = {
    autoTare: true,
    momentary: false,
    reedSwitch: false,
    minShotDuration: 1,
    maxShotDuration: 25,
    dripDelay: 3,
    weightValue: 36,
};

export const usePeripheralSettings = (config: PeripheralConfig) => {
    const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(false);

    console.log("settings", config)

    const delay = (ms: number): Promise<void> => 
        new Promise(resolve => setTimeout(resolve, ms));

    const readCharacteristic = async (characteristic: string, retries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const data = await BleManager.read(
                    config.deviceId,
                    config.serviceUUID,
                    characteristic
                );
                console.log("read characteristic", characteristic, data)
                if (characteristic === config.characteristics.AUTO_TARE ||
                    characteristic === config.characteristics.MOMENTARY ||
                    characteristic === config.characteristics.REED_SWITCH) {
                    return data[0] === 1;
                } else {
                    return data[0];
                }
            } catch (error) {
                console.error(`Read attempt ${attempt} failed:`, error);
                if (attempt === retries) throw error;
                await delay(200);
            }
        }
    };

    const writeCharacteristic = async (characteristic: string, value: any): Promise<void> => {
        const bytes = typeof value === 'boolean' ? [value ? 1 : 0] : [Math.max(0, Math.min(255, Math.floor(value)))];

        const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
        console.log("connectedPeripherals", connectedPeripherals)
        
        await BleManager.write(
            config.deviceId,
                config.serviceUUID,
                characteristic,
                bytes,
                1
            );
        console.log("wrote characteristic", characteristic, value)
    };

    const updateSetting = async <K extends keyof DeviceSettings>(
        key: K,
        value: DeviceSettings[K],
        characteristic: string
    ): Promise<void> => {
        const previousValue = settings[key];
        setSettings(prev => ({ ...prev, [key]: value }));
        
        try {
            setIsLoading(true);
            await writeCharacteristic(characteristic, value);
            await AsyncStorage.setItem('@device_settings', JSON.stringify({
                ...settings,
                [key]: value
            }));
        } catch (error) {
            setSettings(prev => ({ ...prev, [key]: previousValue }));
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Export your update functions
    const updateAutoTare = useCallback((value: boolean) => 
        updateSetting('autoTare', value, config.characteristics.AUTO_TARE), []);

    const readAutoTare = useCallback(() => {
        console.log("reading autoTare", config.characteristics.AUTO_TARE)
        return readCharacteristic(config.characteristics.AUTO_TARE)
    }, [config.characteristics.AUTO_TARE]);

    const updateWeightValue = useCallback((value: number) => 
        updateSetting('weightValue', value, config.characteristics.WEIGHT_VALUE), []);

    const readWeightValue = useCallback(() => {
        console.log("reading weightValue", config.characteristics.WEIGHT_VALUE)
        return readCharacteristic(config.characteristics.WEIGHT_VALUE)
    }, [config.characteristics.WEIGHT_VALUE]);

    // ... other update functions ...

    return {
        settings,
        isLoading,
        updateAutoTare,
        readAutoTare,
        updateWeightValue,
        readWeightValue,
        // ... other update functions ...
    };
}; 