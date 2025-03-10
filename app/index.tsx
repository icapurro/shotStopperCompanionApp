// Inspiration: https://dribbble.com/shots/2343572-Countdown-timer
// 👉 Output of the code: https://twitter.com/mironcatalin/status/1321856493382238208

import * as React from "react";
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  Easing,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
  Text,
} from "react-native";
import {SafeAreaView, SafeAreaProvider} from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Feather } from "@expo/vector-icons";
import { useNavigation, usePathname, useRouter } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { useThemeContext } from "./hooks/useThemeContext";
import { StatusBar } from "expo-status-bar";
import { useBLEConnectionContext } from './contexts/BLEConnectionContext';
import { usePeripheralSettings } from './hooks/usePeripheralSettings';
const { width, height } = Dimensions.get("screen");
const color = {
  black: "#111110",
};

const start = 14;
const weights = [...Array(37).keys()].map((i) => (i === 0 ? start : i + start));
const ITEM_SIZE = width * 0.38;
const ITEM_SPACING = (width - ITEM_SIZE) / 2;

export default function App() {
    const { theme } = useThemeContext();
    const colors = theme.colors;
  const router = useRouter();
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const animatedStopValue = React.useRef(new Animated.Value(0)).current;
  const animatedLoadingValue = React.useState(new Animated.Value(0))[0];
  const weightValue = React.useRef(new Animated.Value(height)).current;
  const textAnimatedValue = React.useRef(new Animated.Value(height)).current;
  const [currentWeight, setCurrentWeight] = React.useState(weights[0]);
  const lastVibrationIndex = React.useRef(0);
  const flatList = React.createRef();
  const navigation = useNavigation();
  const pathname = usePathname();
  const { 
    deviceId, 
    isConnected, 
    isLoading: bleLoading,
    weightValue: goalWeight,
    updateAutoTare,
    updateWeightValue,
  } = useBLEConnectionContext();

  const scrollX = React.useRef(new Animated.Value((goalWeight - start) * ITEM_SIZE)).current;
  
  const peripheralConfig = React.useMemo(() => ({
    deviceId: deviceId!,
    serviceUUID: '00000000-0000-0000-0000-000000000ffe',
    characteristics: {
      WEIGHT_VALUE: '00000000-0000-0000-0000-00000000ff11',
      // Add other characteristics as needed
    }
  }), [deviceId]);

  React.useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // Hide the back button in the header (optional)
      gestureEnabled: false, // Disable swipe-to-go-back gesture (optional)
    });
  }, [navigation]);

  React.useEffect(() => {
    const listener = textAnimatedValue.addListener(({ value }) => {
      console.log("value", value)
      setCurrentWeight(value);
    });

    return () => {
      weightValue.removeListener(listener);
      weightValue.removeAllListeners();
    };
  }, [isConnected]);

  React.useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const currentIndex = Math.floor(value / ITEM_SIZE);

      if (currentIndex !== lastVibrationIndex.current) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        lastVibrationIndex.current = currentIndex; // Update last triggered index
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, [scrollX]);

  const animation = React.useCallback(() => {
    textAnimatedValue.setValue(0);
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(weightValue, {
          toValue: 0,
          duration: goalWeight * 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(textAnimatedValue, {
          toValue: goalWeight,
          duration: goalWeight * 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]),
      Animated.delay(100),
    ]).start(() => {
      Vibration.cancel();
      Vibration.vibrate();
      // timerValue.setValue(height);
      // textAnimatedValue.setValue(0);
      Animated.timing(animatedStopValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [goalWeight]);

  const stopBrewIndicator = () => {
      weightValue.setValue(height);
      Animated.timing(textAnimatedValue, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
      Animated.timing(animatedStopValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
  }

  const handleOnPressNavigation = (item: number) => {
    return (event: any) => {
      if(item != goalWeight) {
        flatList?.current?.scrollToIndex({
          index: item - start,
          animated: true,
         });
        return;
      }
    }
  }

  const buttonTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated coffee fill */}
      {/* <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            height,
            width,
            backgroundColor: colors.primary,
            transform: [
              {
                translateY: timerValue,
              },
            ],
          },
        ]}
      />  */}
      {/* <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [
              {
                translateY: buttonTranslateY,
              },
            ],
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 100,
          },
        ]}>
        <TouchableOpacity onPress={animation}>
          <View style={styles.roundButton} />
        </TouchableOpacity>
      </Animated.View> */}
      <View
        style={{
          position: "absolute",
          top: height / 3,
          left: 0,
          right: 0,
          flex: 1,
        }}>
        <Animated.View
          style={{
            opacity: animatedValue,
            width: ITEM_SIZE * 2,
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            alignSelf: "center",
          }}>
          {/* seconds */}
          <Animated.Text style={styles.text}>
            {currentWeight.toFixed(0)}
            <Animated.Text style={{fontSize: ITEM_SIZE * 0.3}}>s</Animated.Text>
          </Animated.Text>
          {/* grams */}
          <Animated.Text style={[styles.text, {fontSize: ITEM_SIZE * 0.3}]}>
            ({currentWeight.toFixed(2)}
            <Animated.Text style={{fontSize: ITEM_SIZE * 0.1}}>g</Animated.Text>
            )
          </Animated.Text>
          <Animated.View
            style={[
              {
                opacity: animatedStopValue,
                alignItems: 'center',
                paddingTop: 100,
              },
            ]}>
            <TouchableOpacity onPress={stopBrewIndicator}>
              <Animated.View style={styles.roundButton}>
                <Feather name="coffee" size={32} color={colors.text} onPress={stopBrewIndicator}/>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
        <Animated.FlatList
          ref={flatList}
          showsHorizontalScrollIndicator={false}
          data={weights}
          keyExtractor={(item) => item.toString()}
          initialScrollIndex={goalWeight - start}
          horizontal
          getItemLayout={(data, index) => ({
            length: ITEM_SIZE, // Adjust based on item width
            offset: ITEM_SIZE * index, // Width * index
            index,
          })}
          snapToInterval={ITEM_SIZE}
          decelerationRate='fast'
          contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
          style={{ flexGrow: 0, opacity }}
          onMomentumScrollEnd={(e) => {
            const value = weights[Math.round(e.nativeEvent.contentOffset.x / ITEM_SIZE)];
            if (isConnected) {
              updateWeightValue(value).catch(error => {
                console.error('Failed to update weight value:', error);
              });
            }
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          bounces={true}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * ITEM_SIZE,
              index * ITEM_SIZE,
              (index + 1) * ITEM_SIZE,
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.5, 1, 0.5],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <View style={{ width: ITEM_SIZE }}>
                <Animated.Text
                  onPress={handleOnPressNavigation(item)}
                  style={[
                    styles.text,
                    {
                      textAlign: "center",
                      opacity,
                      color: colors.primary,
                      transform: [
                        {
                          perspective: ITEM_SIZE,
                        },
                        {
                          scale,
                        },
                      ],
                    },
                  ]}>
                  {item}
                  <Animated.Text style={{fontSize: ITEM_SIZE * 0.3}}>g</Animated.Text>
                </Animated.Text>
              </View>
            );
          }}
        />
      </View>
      <Animated.View style={{ opacity }}>
        <View style={[styles.topBar, styles.horizontal]}>
        <Text style={[styles.titleText, {color: colors.text}]}>shotStopper</Text>
        {bleLoading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Animated.View style={{ opacity: loadingOpacity }}>
              <TouchableOpacity onPress={() => {
                  console.log("press")
                  router.navigate({ pathname: "/settings" });
                }}>
                <Feather name="sliders" style={{paddingTop: 10}} size={24} color={colors.text}/>
              </TouchableOpacity>
          </Animated.View>
        )}
        </View>
      </Animated.View>
      <Animated.View style={[styles.bottomBar, styles.left, { opacity } ]}>
        <View >
          <View style={styles.scaleStatus}>
            <Feather name="wifi" style={{ padding: 1, paddingRight: 10 }} size={16} color={colors.text}/>
            <Animated.Text style={[styles.smallText, {color: colors.text}]}>Scale connected</Animated.Text>
          </View>
    </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    justifyContent: 'flex-start',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    top: 0,
    marginRight: 20,
  },
  left: {
    justifyContent: 'flex-start',
  },
  roundButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: color.black,
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    fontSize: ITEM_SIZE * 0.65,
    fontFamily: "MenloBold",
  },
  scaleStatus: {
    flex: 1,
    flexDirection: 'row',
    textAlign: "center",
    justifyContent: 'flex-end',
    padding: 10,
  },
  smallText: {
    fontSize: 14,
    fontFamily: "MenloRegular",
    fontWeight: "400",
  },
  titleText: {
    fontSize: 32,
    fontFamily: "InstrumentSherif",
    fontWeight: "400",
  },
});
