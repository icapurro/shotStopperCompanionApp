import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, Peripheral } from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid, AppState, AppStateStatus } from 'react-native';
import { Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useRouter } from 'expo-router';

interface DeviceSettings {
    autoTare: boolean;
    momentary: boolean;
    reedSwitch: boolean;
    minShotDuration: number;
    maxShotDuration: number;
    dripDelay: number;
    weightValue: number;
}

interface UseDeviceSettingsReturn {
    settings: DeviceSettings;
    isLoading: boolean;
    updateAutoTare: (value: boolean) => Promise<void>;
    updateMomentary: (value: boolean) => Promise<void>;
    updateReedSwitch: (value: boolean) => Promise<void>;
    updateMinShotDuration: (value: number) => Promise<void>;
    updateMaxShotDuration: (value: number) => Promise<void>;
    updateDripDelay: (value: number) => Promise<void>;
    updateTimerValue: (value: number) => Promise<void>;
    resetToDefaults: () => Promise<void>;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    connectToDevice: () => Promise<void>;
}

// BLE Service and Characteristic UUIDs
const BLE_CONFIG = {
    SERVICE_UUID: '00000000-0000-0000-0000-000000000ffe',
    CHARACTERISTICS: {
        AUTO_TARE: '00000000-0000-0000-0000-00000000ff11',
        MOMENTARY: '00000000-0000-0000-0000-00000000ff11',
        REED_SWITCH: '00000000-0000-0000-0000-00000000ff11',
        MIN_SHOT_DURATION: '00000000-0000-0000-0000-00000000ff11',
        MAX_SHOT_DURATION: '00000000-0000-0000-0000-00000000ff11',
        DRIP_DELAY: '00000000-0000-0000-0000-00000000ff11',
        WEIGHT_VALUE: '00000000-0000-0000-0000-00000000ff11',  // Using the exact UUID from Arduino
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
    weightValue: 36,
};

// Storage key for persisting settings
const SETTINGS_STORAGE_KEY = '@device_settings';

export const useDeviceSettings = (isDevelopment = true): UseDeviceSettingsReturn => {
    const router = useRouter();
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

    // Update your useEffect for BLE listeners
    useEffect(() => {
        // Initialize BLE
        BleManager.start({ showAlert: false }).then(() => {
            console.log("Module initialized");
        });

        BleManager.getConnectedPeripherals([]).then((peripherals) => {
            if (peripherals[0]?.advertising?.localName === 'shotStopper') {
                console.log('Already connected peripherals:', peripherals[0].id);
                setIsScanning(false);
                setIsConnected(true);
                setDeviceId(peripherals[0].id);
            }
        });

        // Set up listeners using BleManager.on* methods
        const onDiscoverListener = BleManager.onDiscoverPeripheral(async (peripheral: Peripheral) => {
            // Some devices might advertise with different names or no name
            const deviceName = peripheral.name || 
                             peripheral.advertising?.localName || 
                             peripheral.advertising?.manufacturerData?.toString();

            console.log('Device name found:', deviceName || 'No name available');

            // Try to connect if it's our device
            if (deviceName && deviceName.toLowerCase().includes('shot')) {
                // try {
                    console.log('Found potential device:', deviceName);
                    await BleManager.stopScan();
                    
                    console.log('Attempting connection to:', peripheral.id);
                    await BleManager.connect(peripheral.id);
                    await BleManager.requestConnectionPriority(peripheral.id, 1); // 1 = High priority
                    
                    console.log('Connected, retrieving services...');
                    const peripheralInfo = await BleManager.retrieveServices(peripheral.id);
                    console.log('Device services:', peripheralInfo);
                    

                    
                // } catch (error) {
                //     console.error('Connection error:', error);
                //     setError(`Failed to connect: ${error}`);
                // }
            }
        });

        const onConnectListener = BleManager.onConnectPeripheral(async (args: BleConnectPeripheralEvent) => {
            console.log('Connected to:', args);
            setDeviceId(args.peripheral);
            setIsConnected(true);
            setIsScanning(false);
            setError(null);

            // console.log(await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.WEIGHT_VALUE));
            for (const characteristic of [1]) {
                try {
                    const data = await BleManager.read(
                        args.peripheral,
                    BLE_CONFIG.SERVICE_UUID,
                    BLE_CONFIG.CHARACTERISTICS.WEIGHT_VALUE
                );

                console.log('Weight value:', data);
                } catch (error) {
                    console.error('Error reading weight value:', error);
                }
            }
            
            // try {
            //     // Read all settings from device after connection
            //     await readAllSettings();
            // } catch (error) {
            //     console.error('Error reading initial settings:', error);
            // }
        });

        const onDisconnectListener = BleManager.onDisconnectPeripheral((peripheral: Peripheral) => {
            console.log('Disconnected from:', peripheral);
            setIsConnected(false);
            connectToDevice();
            setError(null);
        });

        const onStopScanListener = BleManager.onStopScan(() => {
            console.log('Scan stopped');
            setIsScanning(false);
        });

        // Handle app state changes
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            console.log('App State changed to:', nextAppState);
            
            if (nextAppState === 'active') {
                console.log('App became active, checking connection');
                const state = await BleManager.checkState();
                
                if (state !== 'on' || !isConnected) {
                    setIsConnected(false);
                    // setDeviceId(null);
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                console.log('App went to background');
                if (deviceId) {
                    try {
                        await BleManager.disconnect(deviceId);
                    } catch (error) {
                        console.error('Error disconnecting:', error);
                    }
                }
            }
        });

        // Cleanup function
        return () => {
            console.log('Cleaning up BLE listeners');
            onDiscoverListener.remove();
            onConnectListener.remove();
            onDisconnectListener.remove();
            onStopScanListener.remove();
            appStateSubscription.remove();
        };
    }, [deviceId, isConnected, router]);

    // Connect to device function
    const connectToDevice = async () => {
        try {
            console.log('Initializing BLE scan...');
            setError(null);
            setIsScanning(true);

            // Make sure Bluetooth is enabled
            const state = await BleManager.checkState();
            console.log('Bluetooth state:', state);
            
            if (state !== 'on') {
                setError('Bluetooth is not enabled');
                return;
            }

            // Get list of connected peripherals first
            const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
            if (connectedPeripherals[0]?.advertising?.localName === 'shotStopper') {
                console.log('Already connected peripherals:', connectedPeripherals);
                setIsScanning(false);
                setIsConnected(true);
                setDeviceId(connectedPeripherals[0].id);
                return;
            }
            

            // Start scanning
            console.log('Starting scan...');
            await BleManager.scan([], 10, false, {
                matchMode: BleScanMatchMode.Aggressive,
                scanMode: BleScanMode.LowLatency,
                callbackType: BleScanCallbackType.AllMatches,
            });

            // Set a timeout to stop scanning
            setTimeout(async () => {
                try {
                    if (isScanning) {
                        console.log('Scan timeout reached, stopping scan...');
                        await BleManager.stopScan();
                        
                        // Get discovered peripherals
                        const peripherals = await BleManager.getDiscoveredPeripherals();
                        console.log('All discovered peripherals:', peripherals);
                        
                        if (!isConnected) {
                            setError('Device not found');
                        }
                    }
                } catch (error) {
                    console.error('Error stopping scan:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Scan error:', error);
            setError('Failed to scan for devices');
            setIsScanning(false);
        }
    };

    // Simulated BLE write for development mode
    const simulatedBleWrite = async (characteristic: string, value: any): Promise<void> => {
        const delay = Math.random() * 500 + 200; // Random delay between 200-700ms
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Development mode: Writing ${value} to characteristic ${characteristic}`);
    };

    // Real BLE write function
    const realBleWrite = async (characteristic: string, value: any): Promise<void> => {
        try {
            if (!deviceId) {
                throw new Error('No device connected');
            }

            // Convert the value to bytes based on its type
            let bytes: number[];
            if (typeof value === 'boolean') {
                bytes = [value ? 1 : 0];
            } else if (typeof value === 'number') {
                // Ensure the number is within byte range (0-255)
                const byteValue = Math.max(0, Math.min(255, Math.floor(value)));
                bytes = [byteValue];
            } else {
                throw new Error('Unsupported value type');
            }

            console.log(`Writing to characteristic ${characteristic}:`, {
                deviceId,
                serviceUUID: BLE_CONFIG.SERVICE_UUID,
                characteristicUUID: characteristic,
                value: bytes,
            });

            await BleManager.write(
                deviceId,
                BLE_CONFIG.SERVICE_UUID,
                characteristic,
                bytes,
                1  // Length is always 1 byte
            );

            console.log('Write successful');
        } catch (error) {
            console.error('BLE write error:', error);
            throw error;
        }
    };

    const delay = (ms: number): Promise<void> => 
        new Promise(resolve => setTimeout(resolve, ms));

    // Read function for getting values from the device
    const readCharacteristic = async (characteristic: string, retries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (!deviceId) {
                    throw new Error('No device connected');
                }

                console.log(`Reading characteristic ${characteristic}`);
                
                const data = await BleManager.read(
                    deviceId,
                    BLE_CONFIG.SERVICE_UUID,
                    characteristic
                );

                console.log('Read data:', data);

                // Convert the received bytes based on the characteristic type
                if (characteristic === BLE_CONFIG.CHARACTERISTICS.AUTO_TARE ||
                    characteristic === BLE_CONFIG.CHARACTERISTICS.MOMENTARY ||
                    characteristic === BLE_CONFIG.CHARACTERISTICS.REED_SWITCH) {
                    return data[0] === 1;
                } else {
                    // For number values, just return the single byte value
                    return data[0];
                }
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === retries) throw error; // Last attempt failed
                await delay(200); // Wait before retrying
            }
        }
    };

    // Add function to read all settings from device
    const readAllSettings = async () => {
        try {
            setIsLoading(true);
            const newSettings: DeviceSettings = {
                autoTare: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.AUTO_TARE),
                momentary: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.MOMENTARY),
                reedSwitch: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.REED_SWITCH),
                minShotDuration: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.MIN_SHOT_DURATION),
                maxShotDuration: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.MAX_SHOT_DURATION),
                dripDelay: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.DRIP_DELAY),
                weightValue: await readCharacteristic(BLE_CONFIG.CHARACTERISTICS.WEIGHT_VALUE),
            };
            setSettings(newSettings);
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
            console.error('Error reading all settings:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // Choose which BLE write function to use based on development mode
    const bleWrite = realBleWrite;

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
        await updateSetting('weightValue', value, BLE_CONFIG.CHARACTERISTICS.WEIGHT_VALUE);
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
        updateAutoTare,
        updateMomentary,
        updateReedSwitch,
        updateMinShotDuration,
        updateMaxShotDuration,
        updateDripDelay,
        updateTimerValue,
        resetToDefaults,
        isConnected,
        isScanning,
        error,
        connectToDevice,
    };
}; 