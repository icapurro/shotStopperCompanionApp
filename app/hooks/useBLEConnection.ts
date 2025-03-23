import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, BleState, Peripheral } from 'react-native-ble-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS, requestMultiple } from 'react-native-permissions';

interface BLEConnectionState {
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    bluetoothState: BleState;
}

export enum ScaleStatus {
    DISCONNECTED = 0,
    CONNECTED = 1
}

export const scanDuration = 5;

const serviceUUIDs = ['00000000-0000-0000-0000-000000000ffe', '00002a98-0000-1000-8000-00805f9b34fb'];

const currentConfig = {
    deviceId: '',
    serviceUUID: '00000000-0000-0000-0000-000000000ffe',
    characteristics: {
        WEIGHT_VALUE: '00000000-0000-0000-0000-00000000FF11',
        REED_SWITCH: '00000000-0000-0000-0000-00000000FF12',
        MOMENTARY: '00000000-0000-0000-0000-00000000FF13',
        AUTO_TARE: '00000000-0000-0000-0000-00000000FF14',
        MIN_SHOT_DURATION: '00000000-0000-0000-0000-00000000FF15',
        MAX_SHOT_DURATION: '00000000-0000-0000-0000-00000000FF16',
        DRIP_DELAY: '00000000-0000-0000-0000-00000000FF17',
        FIRMWARE_VERSION: '00000000-0000-0000-0000-00000000FF18',
        SCALE_STATUS: '00000000-0000-0000-0000-00000000FF19',
    }
}

const legacyConfig = {
    deviceId: '',
    serviceUUID: '00002a98-0000-1000-8000-00805f9b34fb',
    characteristics: {
        WEIGHT_VALUE: '00000000-0000-0000-0000-000000002a98',
        FIRMWARE_VERSION: '00000000-0000-0000-0000-00000000FF18',
    }
}

interface DeviceSettings {
    autoTare: boolean;
    momentary: boolean;
    reedSwitch: boolean;
    minShotDuration: number;
    maxShotDuration: number;
    dripDelay: number;
    weightValue: number;
    scaleStatus: ScaleStatus;
    firmwareVersion: number;
}

const requestBlePermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
        const bluetoothStatus = await request(PERMISSIONS.IOS.BLUETOOTH);
        return bluetoothStatus === RESULTS.GRANTED;
    } else if (Platform.OS === 'android') {
        // For Android 12+ (SDK 31+)
        if (Platform.Version >= 31) {
            const results = await requestMultiple([
                PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
                PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
                PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            ]);
            return Object.values(results).every(result => result === RESULTS.GRANTED);
        } else {
            // For older Android versions, request legacy permissions
            const results = await requestMultiple([
                PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            ]);
            return Object.values(results).every(result => result === RESULTS.GRANTED);
        }
    }
    return false;
};

const getConfig = (serviceUUID: string, deviceId: string) => {
    const config = serviceUUID === currentConfig.serviceUUID ? currentConfig : legacyConfig;
    config.deviceId = deviceId;
    return config;
}

export const useBLEConnection = () => {

    const isConnecting = useRef(false);
    const config = useRef<any>(currentConfig);

    const [state, setState] = useState<BLEConnectionState>({
        isConnected: false,
        isScanning: false,
        bluetoothState: BleState.On,
        error: null
    });

    const [settings, setSettings] = useState<DeviceSettings>({
        autoTare: false,
        momentary: false,
        reedSwitch: false,
        minShotDuration: 0,
        maxShotDuration: 0,
        dripDelay: 0,
        weightValue: 36,
        scaleStatus: ScaleStatus.DISCONNECTED,
        firmwareVersion: 0,
    });

    const [isLoading, setIsLoading] = useState(false);

    const delay = (ms: number): Promise<void> => 
        new Promise(resolve => setTimeout(resolve, ms));

    const connectToDevice = async () => {
        if (isConnecting.current) {
            console.log('Already scanning, skipping...');
            return;
        }

        if (AppState.currentState !== 'active') {
            console.log("App is not active, skipping...")
            return;
        }
        const hasPermission = await requestBlePermissions();
        if (!hasPermission) {
            setState(prev => ({ 
                ...prev, 
                error: 'Bluetooth permissions not granted', 
                isScanning: false 
            }));
            return;
        }
        try {
            isConnecting.current = true;
            console.log('Initializing BLE scan...');

            setState(prev => ({ ...prev, error: null, isScanning: true }));

            const bleState = await BleManager.checkState();
            
            if (bleState !== 'on') {
                setState(prev => ({ ...prev, error: 'Bluetooth is not enabled', isScanning: false, bluetoothState: bleState }));
                return;
            }

            // Check for existing connections
            const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
            if (connectedPeripherals[0]?.advertising?.localName === 'shotStopper') {
                const serviceUUID = connectedPeripherals[0].advertising?.serviceUUIDs?.[0] ?? currentConfig.serviceUUID;
                config.current = getConfig(serviceUUID, connectedPeripherals[0].id);
                await BleManager.connect(config.current.deviceId);
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(config.current.deviceId, 1);
                }
                await BleManager.retrieveServices(config.current.deviceId);
                await readAllSettings();
                setState({
                    isScanning: false,
                    isConnected: true,
                    error: null,
                    bluetoothState: bleState
                });
                return;
            } else {
                await BleManager.scan(serviceUUIDs, scanDuration, false, {
                    matchMode: BleScanMatchMode.Aggressive,
                    scanMode: BleScanMode.LowLatency,
                    callbackType: BleScanCallbackType.AllMatches,
                });
            }

        } catch (error) {
            console.error('Scan error:', error);
            config.current.deviceId = null;
            setState(prev => ({
                ...prev,
                error: 'Failed to scan for devices',
                isScanning: false,
                isConnected: false,
            }));
            setIsLoading(false);
        } finally {
            isConnecting.current = false;
        }
    };

    const disconnectFromDevice = async () => {
        if (config.current) {
            await BleManager.disconnect(config.current.deviceId);
            config.current.deviceId = null;
        }
        setState(prev => ({
            ...prev,
            isConnected: false,
            isScanning: true,
        }));
    };

    useEffect(() => {

        const onDiscoverListener = BleManager.onDiscoverPeripheral(async (peripheral: Peripheral) => {
            console.log("onDiscoverListener", peripheral)
            try {
                const serviceUUID = peripheral.advertising?.serviceUUIDs?.[0] ?? currentConfig.serviceUUID;
                config.current = getConfig(serviceUUID, peripheral.id);
                await BleManager.connect(config.current.deviceId);
                if (Platform.OS === 'android') {
                    await BleManager.requestConnectionPriority(config.current.deviceId, 1);
                }
                await BleManager.retrieveServices(config.current.deviceId);
                const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
                console.log("connectedPeripherals", connectedPeripherals)
                await readAllSettings();
            } catch (error) {
                console.error('Connection error:', error);
            } finally {
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    isScanning: false,
                    error: null
                }));
                await BleManager.stopScan();
            }
        });

        const onDidUpdateStateListener = BleManager.onDidUpdateState((event: any) => {
            try {
                console.log('Bluetooth state:', event);
                if (state.bluetoothState !== event.state && (event.state === 'on' || event.state === 'off')) {
                    
                    const shouldDisconnect = state.bluetoothState === BleState.On && state.isConnected && event.state === 'off';
                    setState(prev => ({ ...prev, bluetoothState: event.state, isConnected: shouldDisconnect ? false : prev.isConnected }));
                    if (event.state === 'on') {
                        console.log('Auto-reconnecting...');
                        connectToDevice(); // Auto-reconnect
                    }
                }
            } catch (error) {
                console.error('Error updating Bluetooth state:', error);
            }
        });

        const onConnectListener = BleManager.onConnectPeripheral(async (args: any) => {
            console.log('Connected to:', args);
            // BleManager.stopScan();
            // deviceId.current = args.peripheral;
        });

        const onDisconnectListener = BleManager.onDisconnectPeripheral((event: any) => {
            console.log('Disconnected from:', event);
            // deviceId.current = null;
            setState(prev => ({
                ...prev,
                isConnected: false,
                isScanning: false,
            }));
        });

        const onStopScanListener = BleManager.onStopScan(() => {
            setState(prev => ({ ...prev, isScanning: false }));
        });

        const onScaleStatusListener = BleManager.onDidUpdateValueForCharacteristic(async (args: any) => {
            if (args.characteristic === config.current.characteristics.SCALE_STATUS) {
                console.log("scaleStatusListener", args)
                setSettings(prev => ({ ...prev, scaleStatus: args.value[0] }));
            }
        });

        if (!state.isConnected || state.error) {
            connectToDevice();
        }
        return () => {
            onDiscoverListener.remove();
            onConnectListener.remove();
            onDisconnectListener.remove();
            onStopScanListener.remove();
            onDidUpdateStateListener.remove();
            onScaleStatusListener.remove();
        };
    }, [config, state.isConnected, state.error]);

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            console.log("appStateSubscription", nextAppState)
            if (nextAppState === 'active') {
                isConnecting.current = false;
                await connectToDevice();
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                await disconnectFromDevice();
            }
        });

        return () => appStateSubscription.remove();
    }, []);

    const readCharacteristic = async (characteristic: string, retries = 3): Promise<any> => {
        if (!config.current) {
            throw new Error('Config is not set');
        }
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const data = await BleManager.read(
                    config.current.deviceId,
                    config.current.serviceUUID,
                    characteristic
                );
                console.log("read characteristic", characteristic, data)
                if (characteristic === config.current.characteristics.AUTO_TARE ||
                    characteristic === config.current.characteristics.MOMENTARY ||
                    characteristic === config.current.characteristics.REED_SWITCH) {
                    return data[0] === 1;
                } else {
                    return data[0];
                }
            } catch (error) {
                console.error(`Read attempt ${attempt} failed:`, error);
                if (attempt === retries) {
                    throw error;
                }
                await delay(200);
            }
        }
    };

    const writeCharacteristic = async (characteristic: string, value: any): Promise<void> => {
        try {
            if (!config.current) {
                throw new Error('Config is not set');
            }
            const bytes = typeof value === 'boolean' ? [value ? 1 : 0] : [Math.max(0, Math.min(255, Math.floor(value)))];

            const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
            console.log("connectedPeripherals", connectedPeripherals)
            
            await BleManager.write(
                    config.current.deviceId,
                    config.current.serviceUUID,
                    characteristic,
                    bytes,
                    1
                );
            console.log("wrote characteristic", characteristic, value)
        } catch (error) {
            await disconnectFromDevice();
            throw error;
        }
    };

    const updateSetting = async <K extends keyof DeviceSettings>(
        key: K,
        value: DeviceSettings[K],
        characteristic: string
    ): Promise<void> => {
        const previousValue = settings[key];
        if (value === previousValue) {
            return;
        }
        try {
            setIsLoading(true);
            await writeCharacteristic(characteristic, value);
            
        } catch (error) {
            setSettings(prev => ({ ...prev, [key]: previousValue }));
            await disconnectFromDevice();
            throw error;
        } finally {
            setIsLoading(false);
            setSettings(prev => ({ ...prev, [key]: value }));
        }
    };

    const listenForScaleStatus = async () => {
        if (!config.current) {
            throw new Error('Config is not set');
        }
        await BleManager.startNotification(config.current.deviceId, config.current.serviceUUID, config.current.characteristics.SCALE_STATUS);
    }

    const readAllSettings = useCallback(async () => {
        var firmwareVersion = 0;
        try {
            firmwareVersion = await readFirmwareVersion();
        } catch (error) {
            setSettings(prev => ({
                ...prev,
                firmwareVersion: 0,
            }));
        }
        const weightValue = await readWeightValue();
        setSettings(prev => ({
            ...prev,
            weightValue,
            firmwareVersion,
        }));

        if (firmwareVersion > 0) {
            const [autoTare, momentary, reedSwitch, minShotDuration, maxShotDuration, dripDelay] = await Promise.all([
                readAutoTare(),
                readMomentary(),
                readReedSwitch(),
                readMinShotDuration(),
                readMaxShotDuration(),
                readDripDelay(),
            ]);
            await listenForScaleStatus();
            setSettings(prev => ({
                ...prev,
                autoTare,
                momentary,
                reedSwitch,
                minShotDuration,
                maxShotDuration,
                dripDelay,
            }));
        }
    }, []);

    // Export your update functions
    const updateAutoTare = useCallback((value: boolean) => 
        updateSetting('autoTare', value, config.current.characteristics.AUTO_TARE), []);

    const readAutoTare = useCallback(() => {
        console.log("reading autoTare", config.current.characteristics.AUTO_TARE)
        return readCharacteristic(config.current.characteristics.AUTO_TARE)
    }, [config.current.characteristics.AUTO_TARE]);

    const updateWeightValue = useCallback((value: number) => {
        return updateSetting('weightValue', value, config.current.characteristics.WEIGHT_VALUE)
    }, []);

    const readWeightValue = useCallback(async () => {
        console.log("reading weightValue", config.current.characteristics.WEIGHT_VALUE)
        const weightValue = await readCharacteristic(config.current.characteristics.WEIGHT_VALUE)
        return Number(weightValue)
    }, [config.current.characteristics.WEIGHT_VALUE]);

    const updateMomentary = useCallback((value: boolean) => 
        updateSetting('momentary', value, config.current.characteristics.MOMENTARY), []);

    const readMomentary = useCallback(() => {
        console.log("reading momentary", config.current.characteristics.MOMENTARY)
        return readCharacteristic(config.current.characteristics.MOMENTARY)
    }, [config.current.characteristics.MOMENTARY]);

    const updateReedSwitch = useCallback((value: boolean) => 
        updateSetting('reedSwitch', value, config.current.characteristics.REED_SWITCH), []);

    const readReedSwitch = useCallback(() => {
        console.log("reading reedSwitch", config.current.characteristics.REED_SWITCH)
        return readCharacteristic(config.current.characteristics.REED_SWITCH)
    }, [config.current.characteristics.REED_SWITCH]);

    const updateMinShotDuration = useCallback((value: number) => 
        updateSetting('minShotDuration', value, config.current.characteristics.MIN_SHOT_DURATION), []);

    const readMinShotDuration = useCallback(() => {
        console.log("reading minShotDuration", config.current.characteristics.MIN_SHOT_DURATION)
        return readCharacteristic(config.current.characteristics.MIN_SHOT_DURATION)
    }, [config.current.characteristics.MIN_SHOT_DURATION]);

    const updateMaxShotDuration = useCallback((value: number) => 
        updateSetting('maxShotDuration', value, config.current.characteristics.MAX_SHOT_DURATION), []);

    const readMaxShotDuration = useCallback(() => {
        console.log("reading maxShotDuration", config.current.characteristics.MAX_SHOT_DURATION)
        return readCharacteristic(config.current.characteristics.MAX_SHOT_DURATION)
    }, [config.current.characteristics.MAX_SHOT_DURATION]);

    const updateDripDelay = useCallback((value: number) => 
        updateSetting('dripDelay', value, config.current.characteristics.DRIP_DELAY), []);

    const readDripDelay = useCallback(() => {
        console.log("reading dripDelay", config.current.characteristics.DRIP_DELAY)
        return readCharacteristic(config.current.characteristics.DRIP_DELAY)
    }, [config.current.characteristics.DRIP_DELAY]);

    const readFirmwareVersion = useCallback(() => {
        console.log("reading firmwareVersion", config.current.characteristics.FIRMWARE_VERSION)
        return readCharacteristic(config.current.characteristics.FIRMWARE_VERSION, 1)
    }, [config.current.characteristics.FIRMWARE_VERSION]);

    const resetToDefaults = useCallback(async () => {
        await writeCharacteristic(config.current.characteristics.WEIGHT_VALUE, 36);
        await writeCharacteristic(config.current.characteristics.AUTO_TARE, true);
        await writeCharacteristic(config.current.characteristics.MOMENTARY, false);
        await writeCharacteristic(config.current.characteristics.REED_SWITCH, false);
        await writeCharacteristic(config.current.characteristics.MIN_SHOT_DURATION, 3);
        await writeCharacteristic(config.current.characteristics.MAX_SHOT_DURATION, 50);
        await writeCharacteristic(config.current.characteristics.DRIP_DELAY, 3);
        setSettings(prev => ({
            ...prev,
            autoTare: true,
            weightValue: 36,
            momentary: false,
            reedSwitch: false,
            minShotDuration: 3,
            maxShotDuration: 50,
            dripDelay: 3,
        }));
    }, []);

    const bleConnection = useMemo(() => ({
        ...state,
        ...settings,
        isLoading,
        isConnecting,
        connectToDevice,
        updateAutoTare,
        readAutoTare, 
        updateWeightValue,
        readWeightValue,
        updateMomentary,
        readMomentary,
        updateReedSwitch,
        readReedSwitch,
        updateMinShotDuration,
        readMinShotDuration,
        updateMaxShotDuration,
        readMaxShotDuration,
        updateDripDelay,
        readDripDelay,
        readAllSettings,
        resetToDefaults,
        deviceId: config.current?.deviceId,
    }), [state, settings, isLoading, isConnecting, connectToDevice, updateAutoTare, readAutoTare, updateWeightValue, readWeightValue, updateMomentary, readMomentary, updateReedSwitch, readReedSwitch, updateMinShotDuration, readMinShotDuration, updateMaxShotDuration, readMaxShotDuration, updateDripDelay, readDripDelay, readAllSettings, resetToDefaults, config.current?.deviceId]);

    return bleConnection;
}; 