import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { View as MView, Text as MText } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { useThemeContext } from '../hooks/useThemeContext';

interface BLEConnectionGuardProps {
    children: React.ReactNode;
}

export function BLEConnectionGuard({ children }: BLEConnectionGuardProps) {
    const { isConnected, isScanning, error, connectToDevice, bluetoothState } = useBLEConnection();
    const { theme } = useThemeContext();
    const colors = theme.colors;
    const router = useRouter();
    const navigation = useNavigation();
    useEffect(() => {
        if (navigation && !isConnected && !isScanning) {
            // router.replace('/');
        }
    }, [isConnected, isScanning, bluetoothState]);

    // useEffect(() => {
    //     console.log('Evaluating Trigger connection');
    //     if (bluetoothState === 'on' && !isConnected && !isScanning) {
    //         console.log('Trigger connection');
    //         connectToDevice();
    //     }
    // }, []);

    // useEffect(() => {
    //     if (bluetoothState === 'on' && !isConnected && !isScanning) {
    //         console.log('Trigger connection');
    //         connectToDevice();
    //     }
    // }, [bluetoothState, isConnected, isScanning]);

    if (!isConnected) {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <MView
                    style={[styles.dot, styles.center, { backgroundColor: colors.primary }]}
                >
                    {[...Array(3).keys()].map(i => (
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
            </View>
        );
    }

    return (
        <>{children}</>
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
}); 