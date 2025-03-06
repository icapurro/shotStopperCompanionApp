/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

const tintColorLight = '#E44C25';
const tintColorDark = '#E9E7E0';


const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    text: '#111110',
    background: '#E9E7E0',
    altBackground: '#DEDCD3',
    card: '#DEDCD3',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    black: "#111110",
    primary: "#E44C25",
    white: '#E9E7E0',
  },
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    text: '#E9E7E0',
    background: '#111110',
    altBackground: '#2D2B28',
    card: '#2D2B28',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    black: "#111110",
    primary: "#E44C25",
    white: '#E9E7E0',
  },
};

export { MyLightTheme, MyDarkTheme };