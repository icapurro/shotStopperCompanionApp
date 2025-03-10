import { useState, useEffect, useRef, useCallback } from 'react';
import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, BleState, Peripheral } from 'react-native-ble-manager';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, request, PERMISSIONS, RESULTS, requestMultiple } from 'react-native-permissions';

interface BLEConnectionState {
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    bluetoothState: BleState;
}

const config = {
    serviceUUID: '00000000-0000-0000-0000-000000000ffe',
    characteristics: {
        AUTO_TARE: '00000000-0000-0000-0000-00000000ff12',
        MOMENTARY: '00000000-0000-0000-0000-00000000ff13',
        REED_SWITCH: '00000000-0000-0000-0000-00000000ff14',
        MIN_SHOT_DURATION: '00000000-0000-0000-0000-00000000ff11',
        MAX_SHOT_DURATION: '00000000-0000-0000-0000-00000000ff11',
        DRIP_DELAY: '00000000-0000-0000-0000-00000000ff11',
        WEIGHT_VALUE: '00000000-0000-0000-0000-00000000ff11',
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
                'android.permission.BLUETOOTH',
            ]);
            return Object.values(results).every(result => result === RESULTS.GRANTED);
        }
    }
    return false;
};

export const useBLEConnection = () => {

    const isConnecting = useRef(false);
    const deviceId = useRef<string | null>(null);

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
                deviceId.current = connectedPeripherals[0].id;                    
                await BleManager.connect(deviceId.current);
                await BleManager.requestConnectionPriority(deviceId.current, 1);
                await BleManager.retrieveServices(deviceId.current);
                await readWeightValue();
                setState({
                    isScanning: false,
                    isConnected: true,
                    error: null,
                    bluetoothState: bleState
                });
                return;
            } else {
                await BleManager.scan([], 10, false, {
                    matchMode: BleScanMatchMode.Aggressive,
                    scanMode: BleScanMode.LowLatency,
                    callbackType: BleScanCallbackType.AllMatches,
                });
            }

        } catch (error) {
            console.error('Scan error:', error);
            deviceId.current = null;
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
        if (deviceId.current) {
            await BleManager.disconnect(deviceId.current);
            deviceId.current = null;
        }
        setState(prev => ({
            ...prev,
            isConnected: false,
            isScanning: true,
        }));
    };

    useEffect(() => {
        // Initialize BLE
        BleManager.start({ showAlert: false }).then(() => {
            console.log("BLE Module initialized");
        });

        const onDiscoverListener = BleManager.onDiscoverPeripheral(async (peripheral: Peripheral) => {
            const deviceName = peripheral.name || 
                             peripheral.advertising?.localName || 
                             peripheral.advertising?.manufacturerData?.toString();

            console.log("deviceName", deviceName)

            if (deviceName?.toLowerCase().includes('shot')) {
                try {
                    deviceId.current = peripheral.id;
                    await BleManager.connect(peripheral.id);
                    await BleManager.requestConnectionPriority(peripheral.id, 1);
                    await BleManager.retrieveServices(peripheral.id);
                    await readWeightValue();
                } catch (error) {
                    console.error('Connection error:', error);
                } finally {
                    await BleManager.stopScan();
                    setState(prev => ({
                        ...prev,
                        isConnected: true,
                        isScanning: false,
                        error: null
                    }));
                }
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
            BleManager.stopScan();
            deviceId.current = args.peripheral;
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

        if (!state.isConnected || state.error) {
            console.log("connecting to device on mount")
            connectToDevice();
        }

        return () => {
            onDiscoverListener.remove();
            onConnectListener.remove();
            onDisconnectListener.remove();
            onStopScanListener.remove();
            onDidUpdateStateListener.remove();
        };
    }, [deviceId, state.isConnected, state.error]);

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            console.log("appStateSubscription", nextAppState)
            if (nextAppState === 'active') {
                await connectToDevice();
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                await disconnectFromDevice();
            }
        });

        return () => appStateSubscription.remove();
    }, []);

    const readCharacteristic = async (characteristic: string, retries = 3): Promise<any> => {
        if (!deviceId.current) {
            throw new Error('Device ID is not set');
        }
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const data = await BleManager.read(
                    deviceId.current,
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
                if (attempt === retries) {
                    throw error;
                }
                await delay(200);
            }
        }
    };

    const writeCharacteristic = async (characteristic: string, value: any): Promise<void> => {
        try {
            if (!deviceId.current) {
                throw new Error('Device ID is not set');
            }
            const bytes = typeof value === 'boolean' ? [value ? 1 : 0] : [Math.max(0, Math.min(255, Math.floor(value)))];

            const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
            console.log("connectedPeripherals", connectedPeripherals)
            
            await BleManager.write(
                    deviceId.current,
                    config.serviceUUID,
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
            await disconnectFromDevice();
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

    const readWeightValue = useCallback(async () => {
        console.log("reading weightValue", config.characteristics.WEIGHT_VALUE)
        const weightValue = await readCharacteristic(config.characteristics.WEIGHT_VALUE)
        setSettings(prev => ({ ...prev, weightValue: Number(weightValue) }));
        console.log("weightValue", weightValue)
        return Number(weightValue)
    }, [config.characteristics.WEIGHT_VALUE]);

    return {
        ...state,
        ...settings,
        isLoading,
        connectToDevice,
        updateAutoTare,
        readAutoTare, 
        updateWeightValue,
        readWeightValue,
    };
}; 