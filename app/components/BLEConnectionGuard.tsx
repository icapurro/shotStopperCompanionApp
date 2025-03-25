import React from 'react';
import { View, StyleSheet, Pressable, Text, TouchableWithoutFeedback } from 'react-native';
import { View as MView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../hooks/useThemeContext';
import { BLEConnectionProvider, useBLEConnectionContext } from '../contexts/BLEConnectionContext';
import { StatusBar } from 'expo-status-bar';
import DemoMode from './DemoMode';

interface BLEConnectionGuardProps {
    children: React.ReactNode;
}

function Guard({ children }: { children: React.ReactNode }) {
    const { isConnected, isScanning, connectToDevice, isConnecting, bluetoothState, demoConnectToDevice, isDemoMode } = useBLEConnectionContext();
    const { theme, isDarkMode } = useThemeContext();
    const colors = theme.colors;

    if (isScanning || !isConnected) {
        return (
            <Pressable onPress={connectToDevice} style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <MView
                    style={[styles.dot, styles.center, { backgroundColor: colors.primary }]}
                >
                    {(isScanning || isConnecting.current ) && [...Array(3).keys()].map(i => (
                        <MView
                            key={i}
                            from={{scale: 1, opacity: .3,}}
                            animate={{scale: 4, opacity: 0}}
                            transition={{
                                loop: true,
                                repeatReverse: false,
                                duration: 2000,
                                delay: i * 400,
                                type: 'timing',
                                easing: Easing.out(Easing.ease)
                            }}
                            style={[StyleSheet.absoluteFillObject, styles.dot, { backgroundColor: colors.primary }]}
                        />
                    ))}
                    <Feather name="bluetooth" size={32} color={colors.white}/>
                </MView>
                <View style={styles.textContainer}>
                    {!isScanning && !isConnecting.current && <Text style={[styles.paragraph, {color: colors.text, textAlign: 'center'}]}>{bluetoothState === 'on' ? 'Tap to connect' : 'Bluetooth is off'}</Text>}
                </View>
                {/* This long press is to enable demo mode so the app store reviewer can approve the app */}
                <TouchableWithoutFeedback onPress={()=>console.log("short press")} onLongPress={demoConnectToDevice}>
                    <View style={{position: 'absolute', top: 60, left: 10, padding: 60}}>
                    </View>
                </TouchableWithoutFeedback>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <DemoMode />
            </Pressable>
        );
    }

    return (
        <>{children}</>
    );
}

export default function BLEConnectionGuard({ children }: BLEConnectionGuardProps) {
    return (
        <BLEConnectionProvider>
            <Guard>{children}</Guard>
        </BLEConnectionProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        zIndex: 1,
    },
    textContainer: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    paragraph: {
        fontSize: 14,
        fontFamily: "MenloRegular",
    },
}); 