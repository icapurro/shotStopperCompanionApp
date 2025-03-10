import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { View as MView, Text as MText } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { useThemeContext } from '../hooks/useThemeContext';
import { BLEConnectionProvider, useBLEConnectionContext } from '../contexts/BLEConnectionContext';
import { usePathname } from 'expo-router';

interface BLEConnectionGuardProps {
    children: React.ReactNode;
}

function Guard({ children }: { children: React.ReactNode }) {
    const { isConnected, isScanning } = useBLEConnectionContext();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isConnected && !isScanning && pathname !== '/') {
            router.replace('/');
        }
    }, [isConnected, isScanning, pathname]);

    const { theme } = useThemeContext();
    const colors = theme.colors;

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
}); 