import * as React from 'react';
import { useColorScheme } from 'react-native';
import { Theme } from '@react-navigation/native';
import { MyDarkTheme, MyLightTheme } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeOverride = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    theme: Theme;
    isDarkMode: boolean;
    toggleTheme: () => void;
    themeOverride: ThemeOverride;
    setThemeOverride: (mode: ThemeOverride) => Promise<void>;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@theme_override';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeOverride, setThemeOverrideState] = React.useState<ThemeOverride>('auto');
    const [isDarkMode, setIsDarkMode] = React.useState(systemColorScheme === 'dark');

    // Load saved theme override on mount
    React.useEffect(() => {
        const loadSavedTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme) {
                    setThemeOverrideState(savedTheme as ThemeOverride);
                    if (savedTheme !== 'auto') {
                        setIsDarkMode(savedTheme === 'dark');
                    }
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            }
        };
        loadSavedTheme();
    }, []);

    // Handle system theme changes
    React.useEffect(() => {
        if (themeOverride === 'auto') {
            setIsDarkMode(systemColorScheme === 'dark');
        }
    }, [systemColorScheme, themeOverride]);

    const setThemeOverride = React.useCallback(async (mode: ThemeOverride) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeOverrideState(mode);
            if (mode === 'auto') {
                setIsDarkMode(systemColorScheme === 'dark');
            } else {
                setIsDarkMode(mode === 'dark');
            }
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    }, [systemColorScheme]);

    const toggleTheme = React.useCallback(() => {
        if (themeOverride === 'auto') {
            // If in auto mode, switching should set an explicit theme
            setThemeOverride(systemColorScheme === 'dark' ? 'light' : 'dark');
        } else {
            // If in explicit mode, just toggle between light and dark
            setThemeOverride(isDarkMode ? 'light' : 'dark');
        }
    }, [isDarkMode, themeOverride, systemColorScheme, setThemeOverride]);

    const theme = React.useMemo(() => ({
        ...(isDarkMode ? MyDarkTheme : MyLightTheme),
    }), [isDarkMode]);

    const value = React.useMemo(() => ({
        theme,
        isDarkMode,
        toggleTheme,
        themeOverride,
        setThemeOverride,
    }), [theme, isDarkMode, toggleTheme, themeOverride, setThemeOverride]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useThemeContext = () => {
    const context = React.useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}; 