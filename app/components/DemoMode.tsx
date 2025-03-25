import { Text } from 'react-native';
import { useBLEConnectionContext } from '../contexts/BLEConnectionContext';
import { useThemeContext } from '../hooks/useThemeContext';
import React from 'react';

export default function DemoMode() {
    const { isDemoMode } = useBLEConnectionContext();
    const { theme } = useThemeContext();
    const colors = theme.colors;
    
    if (!isDemoMode?.current) {
        return null;
    }

    return (
        <Text style={{
            color: colors.white,
            position: 'absolute',
            bottom: 40,
            right: 20,
            backgroundColor: colors.primary,
            padding: 8,
            borderRadius: 4
        }}>
            Demo mode
        </Text>
    );
}