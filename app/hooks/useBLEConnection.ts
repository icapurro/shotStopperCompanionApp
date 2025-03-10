import { useState, useEffect, useRef } from 'react';
import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, BleState, Peripheral } from 'react-native-ble-manager';
import { AppState, AppStateStatus } from 'react-native';

interface BLEConnectionState {
    deviceId: string | null;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    bluetoothState: BleState;
}

export const useBLEConnection = () => {

    const isConnecting = useRef(false);

    const [state, setState] = useState<BLEConnectionState>({
        deviceId: null,
        isConnected: false,
        isScanning: false,
        bluetoothState: BleState.On,
        error: null
    });

    const delay = (ms: number): Promise<void> => 
        new Promise(resolve => setTimeout(resolve, ms));

    const connectToDevice = async () => {
        try {
            if (isConnecting.current) {
                console.log('Already scanning, skipping...');
                return;
            }
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
                setState({
                    isScanning: false,
                    isConnected: true,
                    deviceId: connectedPeripherals[0].id,
                    error: null,
                    bluetoothState: bleState
                });
                return;
            }

            await BleManager.scan([], 10, false, {
                matchMode: BleScanMatchMode.Aggressive,
                scanMode: BleScanMode.LowLatency,
                callbackType: BleScanCallbackType.AllMatches,
            });

        } catch (error) {
            console.error('Scan error:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to scan for devices',
                isScanning: false
            }));
        } finally {
            isConnecting.current = false;
        }
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

            if (deviceName?.toLowerCase().includes('shot')) {
                try {
                    await BleManager.stopScan();
                    await BleManager.connect(peripheral.id);
                    await BleManager.requestConnectionPriority(peripheral.id, 1);
                    await BleManager.retrieveServices(peripheral.id);
                } catch (error) {
                    console.error('Connection error:', error);
                }
            }
        });

        const onDidUpdateStateListener = BleManager.onDidUpdateState((event) => {
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

        const onConnectListener = BleManager.onConnectPeripheral(async (args) => {
            console.log('Connected to:', args);
            setState(prev => ({
                ...prev,
                deviceId: args.peripheral,
                isConnected: true,
                isScanning: false,
                error: null
            }));
        });

        const onDisconnectListener = BleManager.onDisconnectPeripheral((event) => {
            console.log('Disconnected from:', event);
            setState(prev => ({
                ...prev,
                isConnected: false,
                isScanning: false,
                deviceId: null
            }));
            connectToDevice(); // Auto-reconnect
        });

        const onStopScanListener = BleManager.onStopScan(() => {
            setState(prev => ({ ...prev, isScanning: false }));
        });

        const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                const bleState = await BleManager.checkState();
                if (bleState !== 'on' || !state.isConnected) {
                    setState(prev => ({ ...prev, isConnected: false }));
                }
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (state.deviceId) {
                    try {
                        await BleManager.disconnect(state.deviceId);
                    } catch (error) {
                        console.error('Error disconnecting:', error);
                    }
                }
            }
        });

        connectToDevice();

        return () => {
            onDiscoverListener.remove();
            onConnectListener.remove();
            onDisconnectListener.remove();
            onStopScanListener.remove();
            onDidUpdateStateListener.remove();
            appStateSubscription.remove();
        };
    }, [state.deviceId, state.isConnected]);

    return {
        ...state,
        connectToDevice
    };
}; 