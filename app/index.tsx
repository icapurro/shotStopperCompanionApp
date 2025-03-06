/*
    Inspiration: -
*/
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { View as MView, Text as MText } from 'moti';
import { Feather } from '@expo/vector-icons';
import { Easing } from 'react-native-reanimated';
import { useThemeContext } from './hooks/useThemeContext';
import { router } from 'expo-router';
import { useDeviceSettings } from './hooks/useDeviceSettings';
import { useRouter } from 'expo-router';

const _size = 100;

export default function WaveThingy() {
    const { theme } = useThemeContext();
    const colors = theme.colors;
    const { isConnected, isLoading, error, connectToDevice } = useDeviceSettings();
    const router = useRouter();

    // Start connection when component mounts
    React.useEffect(() => {
        connectToDevice();
    }, []);

    // Navigate to home when connected
    React.useEffect(() => {
        if (isConnected) {
            router.push({ pathname: "/home" });
        }
    }, [isConnected]);

    return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
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
}

const styles = StyleSheet.create({
    dot: {width: _size, height: _size, borderRadius: _size },
    center: {alignItems: 'center', justifyContent: 'center'}
})
