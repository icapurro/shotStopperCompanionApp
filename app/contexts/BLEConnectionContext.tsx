import React, { createContext, useContext } from 'react';
import { useBLEConnection } from '../hooks/useBLEConnection';

interface BLEConnectionState {
    deviceId: string | null;
    isConnected: boolean;
    isScanning: boolean;
    error: string | null;
    connectToDevice: () => Promise<void>;
}

const BLEConnectionContext = createContext<BLEConnectionState | null>(null);

export function BLEConnectionProvider({ children }: { children: React.ReactNode }) {
    const bleConnection = useBLEConnection();

    return (
        <BLEConnectionContext.Provider value={bleConnection}>
            {children}
        </BLEConnectionContext.Provider>
    );
}

export function useBLEConnectionContext() {
    const context = useContext(BLEConnectionContext);
    if (!context) {
        throw new Error('useBLEConnectionContext must be used within a BLEConnectionProvider');
    }
    return context;
} 