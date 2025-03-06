import * as React from 'react';
import { ActivityIndicator, SafeAreaView, TouchableOpacity, View, Pressable, StyleSheet, Animated, Text, ScrollView, Switch, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiTransitionProp, View as MView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { useThemeContext } from './hooks/useThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { MyDarkTheme, MyLightTheme } from '@/constants/Colors';
import { Slider } from 'react-native-awesome-slider';
import { useSharedValue } from 'react-native-reanimated';
import { useDeviceSettingsContext } from './hooks/DeviceSettingsContext';
import useDebounce from './hooks/useDebounce';
import { useState, useEffect } from 'react';

interface SettingsItemProps {
    title: string;
    description: string;
    isActive: boolean;
    onToggle: () => void;
    showDivider?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ title, description, isActive, onToggle, showDivider = true }) => {
    const { theme } = useThemeContext();
    
    return (
        <>
            <View style={styles.settingsItemContainer}>
                <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                    <View style={styles.switchContainer}>
                        <Switch
                            trackColor={{
                                false: theme.colors.text,
                                true: theme.colors.primary
                            }}
                            thumbColor={theme.colors.white}
                            ios_backgroundColor={theme.colors.card}
                            onValueChange={onToggle}
                            value={isActive}
                            style={Platform.select({
                                ios: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
                                android: { transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] },
                            })}
                        />
                    </View>
                </View>
                <Text style={[styles.paragraph, { color: theme.colors.text }]}>{description}</Text>
            </View>
            {showDivider && (
                <View style={[styles.dividerContainer]}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.background }]} />
                </View>
            )}
        </>
    );
};

const SettingsGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useThemeContext();
    
    return (
        <View style={styles.itemContainer}>
            <View style={[styles.item, { backgroundColor: theme.colors.card }]}>
                {children}
            </View>
        </View>
    );
};

interface ThemeBoxProps {
    mode: 'light' | 'dark' | 'auto';
    label: string;
    selected: boolean;
    onSelect: () => void;
}

const ThemeBox: React.FC<ThemeBoxProps> = ({ mode, label, selected, onSelect }) => {
    const { theme } = useThemeContext();
    
    const boxStyle = [
        styles.themeBox,
        selected && { borderWidth: 2, borderColor: theme.colors.primary }
    ];
    
    if (mode === 'auto') {
        return (
            <TouchableOpacity style={styles.themeBoxContainer} onPress={onSelect}>
                <View style={boxStyle}>
                    <View style={[styles.themeBoxHalf, { backgroundColor: MyLightTheme.colors.background }]}>
                        <Text style={[styles.themeNumber, { color: MyLightTheme.colors.primary, left: 7 }]}>4</Text>
                    </View>
                    <View style={[styles.themeBoxHalf, { backgroundColor: MyDarkTheme.colors.background }]}>
                        <Text style={[styles.themeNumber, { color: MyDarkTheme.colors.primary, right: 7 }]}>0</Text>
                    </View>
                </View>
                <Text style={[styles.themeLabel, { color: theme.colors.text }]}>{label}</Text>
            </TouchableOpacity>
        );
    }

    const boxTheme = mode === 'dark' ? MyDarkTheme : MyLightTheme;
    
    return (
        <TouchableOpacity style={styles.themeBoxContainer} onPress={onSelect}>
            <View style={[boxStyle, { backgroundColor: boxTheme.colors.background }]}>
                <View style={styles.themeBoxCenter}>
                    <Text style={[styles.themeNumber, { color: boxTheme.colors.primary }]}>40</Text>
                </View>
            </View>
            <Text style={[styles.themeLabel, { color: theme.colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const ThemeSelector: React.FC = () => {
    const { theme, themeOverride, setThemeOverride } = useThemeContext();
    
    return (
        <View style={styles.itemContainer}>
            <View style={[styles.item, { backgroundColor: theme.colors.card, padding: 20 }]}>
                <Text style={[styles.title, { color: theme.colors.text, marginBottom: 20 }]}>Appearance</Text>
                <View style={styles.themeBoxesContainer}>
                    <ThemeBox 
                        mode="light" 
                        label="Light" 
                        selected={themeOverride === 'light'}
                        onSelect={() => setThemeOverride('light')}
                    />
                    <ThemeBox 
                        mode="dark" 
                        label="Dark" 
                        selected={themeOverride === 'dark'}
                        onSelect={() => setThemeOverride('dark')}
                    />
                    <ThemeBox 
                        mode="auto" 
                        label="Auto" 
                        selected={themeOverride === 'auto'}
                        onSelect={() => setThemeOverride('auto')}
                    />
                </View>
            </View>
        </View>
    );
};

interface SliderItemProps {
    title: string;
    description: string;
    value: number;
    onValueChange: (value: number) => void;
    showDivider?: boolean;
    min?: number;
    max?: number;
    step?: number;
}

const SliderItem: React.FC<SliderItemProps> = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    showDivider = true,
    min = 0,
    max = 60,
    step = 1
}) => {
    const { theme } = useThemeContext();
    const progress = useSharedValue(value);
    const min_progress = useSharedValue(min);
    const max_progress = useSharedValue(max);
    const [localValue, setLocalValue] = useState(value);

    // Get the debounced function
    const [debouncedFn] = useDebounce((newValue: number) => {
        onValueChange(newValue);
    }, 500);

    // Update local value and progress when prop value changes
    useEffect(() => {
        setLocalValue(value);
        progress.value = value;
    }, [value]);

    const handleValueChange = (newValue: number) => {
        const roundedValue = Math.round(newValue);
        setLocalValue(roundedValue);
        progress.value = roundedValue;
        debouncedFn(roundedValue);
    };

    const handleIncrement = () => {
        const newValue = Math.min(max, localValue + 1);
        handleValueChange(newValue);
    };

    const handleDecrement = () => {
        const newValue = Math.max(min, localValue - 1);
        handleValueChange(newValue);
    };
    
    return (
        <>
            <View style={styles.settingsItemContainer}>
                <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                    <Text style={[styles.valueText, { color: theme.colors.text }]}>{localValue}s</Text>
                </View>
                <Text style={[styles.paragraph, { color: theme.colors.text, marginBottom: 16 }]}>{description}</Text>
                <View style={styles.sliderContainer}>
                    <TouchableOpacity 
                        style={styles.sliderButton} 
                        onPress={handleDecrement}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <View style={styles.sliderButtonInner}>
                            <Feather name="minus" size={20} color={theme.colors.text} />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.sliderWrapper}>
                        <Slider
                            progress={progress}
                            minimumValue={min_progress}
                            maximumValue={max_progress}
                            step={1}
                            onValueChange={handleValueChange}
                            theme={{
                                minimumTrackTintColor: theme.colors.primary,
                                maximumTrackTintColor: theme.colors.border,
                                bubbleBackgroundColor: theme.colors.card,
                                bubbleTextColor: theme.colors.text,
                                cacheTrackTintColor: theme.colors.primary,
                            }}
                            bubble={(val) => `${Math.round(val)}s`}
                        />
                    </View>
                    <TouchableOpacity 
                        style={styles.sliderButton} 
                        onPress={handleIncrement}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <View style={styles.sliderButtonInner}>
                            <Feather name="plus" size={20} color={theme.colors.text} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            {showDivider && (
                <View style={[styles.dividerContainer]}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.background }]} />
                </View>
            )}
        </>
    );
};

const TimingSettings: React.FC = () => {
    const {
        settings,
        updateMinShotDuration,
        updateMaxShotDuration,
        updateDripDelay,
    } = useDeviceSettingsContext();
    
    return (
        <SettingsGroup>
            <SliderItem
                title="Minimum Shot Duration"
                description='Useful for flushing the group. This ensure that the system will ignore "shots" that last less than this duration'
                value={settings.minShotDuration}
                onValueChange={updateMinShotDuration}
                min={1}
                max={15}
            />
            <SliderItem
                title="Maximum Shot Duration"
                description="Primarily useful for latching switches, since user looses control of the paddle once the system latches."
                value={settings.maxShotDuration}
                onValueChange={updateMaxShotDuration}
                min={30}
                max={120}
            />
            <SliderItem
                title="Drip delay"
                description="Time after the shot ended to measure the final weight"
                value={settings.dripDelay}
                onValueChange={updateDripDelay}
                min={1}
                max={10}
                showDivider={false}
            />
        </SettingsGroup>
    );
};

const ResetButton: React.FC = () => {
    const { theme } = useThemeContext();
    const { resetToDefaults, isLoading } = useDeviceSettingsContext();
    
    return (
        <View style={styles.resetButtonContainer}>
            <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
                onPress={resetToDefaults}
                disabled={isLoading}
            >
                <Text style={styles.resetButtonText}>Factory Reset</Text>
            </TouchableOpacity>
        </View>
    );
};

export default function Settings() {
    const { theme } = useThemeContext();
    const insets = useSafeAreaInsets();
    const {
        settings,
        isLoading: bleLoading,
        updateAutoTare,
        updateMomentary,
        updateReedSwitch,
    } = useDeviceSettingsContext();

    const animatedLoadingValue = React.useState(new Animated.Value(0))[0];

    React.useEffect(() => {
        if (bleLoading) {
            Animated.timing(animatedLoadingValue, {
                toValue: 1,
                duration: 300,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(animatedLoadingValue, {
                toValue: 0,
                duration: 300,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }).start();
        }
    }, [bleLoading]);

    const loadingOpacity = animatedLoadingValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            <View style={[styles.topBar, styles.horizontal]}>
                <Text style={[styles.titleText, {color: theme.colors.text}]}>shotStopper Settings</Text>
                {bleLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                    <Animated.View style={{ opacity: loadingOpacity }}>
                        <TouchableOpacity onPress={() => {
                            router.navigate({ pathname: "/home" });
                        }}>
                            <Feather name="x" size={24} style={{paddingLeft: 20, paddingTop: 10}} color={theme.colors.text} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
            <ScrollView style={styles.listContainer}>
                <ThemeSelector />
                <SettingsGroup>
                    <SettingsItem
                        title="Auto-tare"
                        description="Automatically tare when shot is started and 3 seconds after a latching switch brew (as defined by Momentary)"
                        isActive={settings.autoTare}
                        onToggle={() => updateAutoTare(!settings.autoTare)}
                    />
                    <SettingsItem
                        title="Momentary"
                        description="Defines the brew switch style. Turn ON for momentary switches such as GS3 AV, Silvia Pro and OFF for latching switches such as Linea Mini/Micra"
                        isActive={settings.momentary}
                        onToggle={() => updateMomentary(!settings.momentary)}
                    />
                    <SettingsItem
                        title="Reed Switch"
                        description="Set to true if the brew state is being determined by a reed switch attached to the brew solenoid"
                        isActive={settings.reedSwitch}
                        onToggle={() => updateReedSwitch(!settings.reedSwitch)}
                        showDivider={false}
                    />
                </SettingsGroup>
                <TimingSettings />
                <ResetButton />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        flex: 1,
    },
    topBar: {
        justifyContent: 'flex-start',
        flexDirection: 'row',
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        top: 0,
        margin: 20,
        paddingRight: 20,
        color: 'white',
    },
    itemContainer: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    item: {
        flexDirection: 'column',
        marginVertical: 20,
        borderRadius: 24,
        maxWidth: 450,
        width: '100%',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        width: '100%',
    },
    title: {
        fontSize: 16,
        fontFamily: "MenloRegular",
        flex: 1,
    },
    paragraph: {
        fontSize: 12,
        fontFamily: "MenloRegular",
    },
    titleText: {
        fontSize: 32,
        fontFamily: "InstrumentSherif",
        paddingLeft: 0,
    },
    themeBoxesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    themeBoxContainer: {
        alignItems: 'center',
    },
    themeBox: {
        width: 100,
        height: 100,
        borderRadius: 16,
        marginBottom: 8,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    themeBoxCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeBoxHalf: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeNumber: {
        fontSize: 40,
        fontFamily: 'MenloRegular',
        fontWeight: '600',
    },
    themeLabel: {
        fontSize: 12,
        fontFamily: 'MenloRegular',
        marginTop: 4,
    },
    settingsItemContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    dividerContainer: {
        width: '100%',
    },
    divider: {
        height: 1,
        width: '100%',
        opacity: 1,
    },
    switchContainer: {
        ...Platform.select({
            ios: {
                marginLeft: 8,
            },
            android: {
                marginLeft: 16,
            },
        }),
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: 48,
    },
    sliderWrapper: {
        flex: 1,
        marginHorizontal: 12,
    },
    sliderButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sliderButtonInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueText: {
        fontSize: 16,
        fontFamily: "MenloRegular",
        marginLeft: 8,
    },
    resetButtonContainer: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 40,
        alignItems: 'center',
    },
    resetButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        maxWidth: 450,
        width: '100%',
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'MenloRegular',
        fontWeight: '600',
    },
});