import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { PermissionsAndroid, Platform } from 'react-native';

interface DeviceSettings {
    autoTare: boolean;
    momentary: boolean;
    reedSwitch: boolean;
    minShotDuration: number;
    maxShotDuration: number;
    dripDelay: number;
    timerValue: number;
}

interface UseDeviceSettingsReturn {
    settings: DeviceSettings;
    isLoading: boolean;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    connectToDevice: () => Promise<void>;
    disconnect: () => Promise<void>;
    updateAutoTare: (value: boolean) => Promise<void>;
    updateMomentary: (value: boolean) => Promise<void>;
    updateReedSwitch: (value: boolean) => Promise<void>;
    updateMinShotDuration: (value: number) => Promise<void>;
    updateMaxShotDuration: (value: number) => Promise<void>;
    updateDripDelay: (value: number) => Promise<void>;
    updateTimerValue: (value: number) => Promise<void>;
    resetToDefaults: () => Promise<void>;
}

// BLE Service and Characteristic UUIDs
const BLE_CONFIG = {
    DEVICE_NAME: 'shotStopper',
    SERVICE_UUID: 'your-service-uuid',
    CHARACTERISTICS: {
        AUTO_TARE: 'auto-tare-characteristic-uuid',
        MOMENTARY: 'momentary-characteristic-uuid',
        REED_SWITCH: 'reed-switch-characteristic-uuid',
        MIN_SHOT_DURATION: 'min-shot-duration-characteristic-uuid',
        MAX_SHOT_DURATION: 'max-shot-duration-characteristic-uuid',
        DRIP_DELAY: 'drip-delay-characteristic-uuid',
        TIMER_VALUE: 'timer-value-characteristic-uuid',
    }
};

// Default settings
const DEFAULT_SETTINGS: DeviceSettings = {
    autoTare: true,
    momentary: false,
    reedSwitch: false,
    minShotDuration: 1,
    maxShotDuration: 25,
    dripDelay: 3,
    timerValue: 30,
};

// Storage key for persisting settings
const SETTINGS_STORAGE_KEY = '@device_settings';

export const useDeviceSettings = (isDevelopment = false): UseDeviceSettingsReturn => {
    const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);

    // Load saved settings on mount
    useEffect(() => {
        const loadSavedSettings = async () => {
            try {
                const savedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
                if (savedSettings) {
                    setSettings(JSON.parse(savedSettings));
                }
            } catch (error) {
                console.error('Failed to load saved settings:', error);
            }
        };
        loadSavedSettings();
    }, []);

    // Simulated BLE write for development mode
    const simulatedBleWrite = async (characteristic: string, value: any): Promise<void> => {
        const delay = Math.random() * 500 + 200; // Random delay between 200-700ms
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Development mode: Writing ${value} to characteristic ${characteristic}`);
    };

    // Initialize BLE Manager
    const initializeBLE = useCallback(async () => {
        try {
            await BleManager.start({ showAlert: false });
        } catch (error) {
            console.error('Failed to initialize BLE:', error);
            setError('Failed to initialize Bluetooth');
            throw error;
        }
    }, []);

    // Request permissions (Android only)
    const requestPermissions = useCallback(async () => {
        if (Platform.OS === 'android') {
            const apiLevel = Platform.Version;

            if (apiLevel < 31) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const results = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);
                return Object.values(results).every(
                    (result) => result === PermissionsAndroid.RESULTS.GRANTED
                );
            }
        }
        return true;
    }, []);

    // Handle device connection
    const handleConnect = useCallback(async (peripheral: Peripheral) => {
        try {
            await BleManager.connect(peripheral.id);
            setDeviceId(peripheral.id);
            setIsConnected(true);
            
            // Discover services and characteristics
            await BleManager.retrieveServices(peripheral.id);
            
            // Load initial settings from device
            // TODO: Implement reading initial values from device
            
            setError(null);
        } catch (error) {
            console.error('Connection error:', error);
            setError('Failed to connect to device');
            setIsConnected(false);
            setDeviceId(null);
            throw error;
        }
    }, []);

    // Connect to device
    const connectToDevice = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const hasPermissions = await requestPermissions();
            if (!hasPermissions) {
                setError('Bluetooth permissions not granted');
                return;
            }

            await initializeBLE();
            setIsScanning(true);

            // Start scanning
            await BleManager.scan([BLE_CONFIG.SERVICE_UUID], 5, true);

            // Set up discovery listener
            BleManager.addListener('BleManagerDiscoverPeripheral', async (peripheral) => {
                if (peripheral.name === BLE_CONFIG.DEVICE_NAME) {
                    await BleManager.stopScan();
                    setIsScanning(false);
                    await handleConnect(peripheral);
                }
            });

            // Stop scan after 5 seconds if no device found
            setTimeout(async () => {
                if (isScanning) {
                    await BleManager.stopScan();
                    setIsScanning(false);
                    if (!isConnected) {
                        setError('Device not found');
                    }
                }
            }, 5000);

        } catch (error) {
            console.error('Connection error:', error);
            setError('Failed to connect to device');
        } finally {
            setIsLoading(false);
        }
    }, [isScanning, isConnected]);

    // Disconnect from device
    const disconnect = useCallback(async () => {
        if (deviceId) {
            try {
                await BleManager.disconnect(deviceId);
                setIsConnected(false);
                setDeviceId(null);
            } catch (error) {
                console.error('Disconnect error:', error);
                setError('Failed to disconnect from device');
            }
        }
    }, [deviceId]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (deviceId) {
                disconnect();
            }
        };
    }, [deviceId, disconnect]);

    // Modify existing bleWrite function to use actual BLE in non-development mode
    const bleWrite = useCallback(async (characteristic: string, value: any): Promise<void> => {
        if (isDevelopment) {
            return simulatedBleWrite(characteristic, value);
        }

        if (!deviceId || !isConnected) {
            throw new Error('Device not connected');
        }

        try {
            await BleManager.write(
                deviceId,
                BLE_CONFIG.SERVICE_UUID,
                characteristic,
                Array.isArray(value) ? value : [value]
            );
        } catch (error) {
            console.error('BLE write error:', error);
            throw error;
        }
    }, [deviceId, isConnected, isDevelopment]);

    // Generic update function
    const updateSetting = async <K extends keyof DeviceSettings>(
        key: K,
        value: DeviceSettings[K],
        characteristic: string
    ): Promise<void> => {
        // Optimistically update the UI
        const previousValue = settings[key];
        setSettings(prev => ({ ...prev, [key]: value }));
        
        try {
            setIsLoading(true);
            await bleWrite(characteristic, value);
            // Update AsyncStorage after successful BLE write
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            // Revert to previous value if BLE write fails
            setSettings(prev => ({ ...prev, [key]: previousValue }));
            console.error(`Error updating ${key}:`, error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Individual update functions
    const updateAutoTare = useCallback(async (value: boolean) => {
        await updateSetting('autoTare', value, BLE_CONFIG.CHARACTERISTICS.AUTO_TARE);
    }, [settings]);

    const updateMomentary = useCallback(async (value: boolean) => {
        await updateSetting('momentary', value, BLE_CONFIG.CHARACTERISTICS.MOMENTARY);
    }, [settings]);

    const updateReedSwitch = useCallback(async (value: boolean) => {
        await updateSetting('reedSwitch', value, BLE_CONFIG.CHARACTERISTICS.REED_SWITCH);
    }, [settings]);

    const updateMinShotDuration = useCallback(async (value: number) => {
        await updateSetting('minShotDuration', value, BLE_CONFIG.CHARACTERISTICS.MIN_SHOT_DURATION);
    }, [settings]);

    const updateMaxShotDuration = useCallback(async (value: number) => {
        await updateSetting('maxShotDuration', value, BLE_CONFIG.CHARACTERISTICS.MAX_SHOT_DURATION);
    }, [settings]);

    const updateDripDelay = useCallback(async (value: number) => {
        await updateSetting('dripDelay', value, BLE_CONFIG.CHARACTERISTICS.DRIP_DELAY);
    }, [settings]);

    const updateTimerValue = useCallback(async (value: number) => {
        await updateSetting('timerValue', value, BLE_CONFIG.CHARACTERISTICS.TIMER_VALUE);
    }, [settings]);

    // Reset all settings to defaults
    const resetToDefaults = useCallback(async () => {
        setIsLoading(true);
        try {
            // Update each setting individually to ensure BLE sync
            for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
                const characteristic = BLE_CONFIG.CHARACTERISTICS[key.toUpperCase() as keyof typeof BLE_CONFIG.CHARACTERISTICS];
                await bleWrite(characteristic, value);
            }
            setSettings(DEFAULT_SETTINGS);
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
        } catch (error) {
            console.error('Error resetting settings:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        settings,
        isLoading,
        isConnected,
        isScanning,
        error,
        connectToDevice,
        disconnect,
        updateAutoTare,
        updateMomentary,
        updateReedSwitch,
        updateMinShotDuration,
        updateMaxShotDuration,
        updateDripDelay,
        updateTimerValue,
        resetToDefaults,
    };
}; 