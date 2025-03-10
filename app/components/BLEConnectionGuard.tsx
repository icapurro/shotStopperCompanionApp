import { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { View as MView, Text as MText } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useThemeContext } from '../hooks/useThemeContext';
import { BLEConnectionProvider, useBLEConnectionContext } from '../contexts/BLEConnectionContext';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { isLoading } from 'expo-font';

interface BLEConnectionGuardProps {
    children: React.ReactNode;
}

function Guard({ children }: { children: React.ReactNode }) {
    const { isConnected, isScanning, connectToDevice } = useBLEConnectionContext();
    const { theme, isDarkMode } = useThemeContext();
    const colors = theme.colors;

    if (isScanning || !isConnected) {
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
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            </View>
        );
    }

    // if (!isConnected && !isScanning) {
    //     return (
    //         <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
    //             <View
    //                 style={[styles.dot, styles.center, { backgroundColor: colors.primary }]}
    //             >
    //                 <Feather name="bluetooth" size={32} color={colors.white} onPress={async () => await connectToDevice()}/>
                    
    //             </View>
    //             <Text style={{ color: colors.text }}>No connection found. Tap to connect.</Text>
    //             <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    //         </View>
    //     );
    // }

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