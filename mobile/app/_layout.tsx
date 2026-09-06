import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated, Image } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { DashboardProvider } from '@/src/contexts/DashboardContext';
import { StravaProvider } from '@/src/contexts/StravaContext';
import { registerForPushNotificationsAsync } from '@/src/services/notificationService';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Safe Splash Screen prevention call wrapped inside try-catch to prevent native startup rejections
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch (e) {
  // Ignore splash screen initialization errors on standalone release builds
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('[RootLayout] Font loading warning:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (loaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, fontError]);

  if (!loaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <DashboardProvider>
        <StravaProvider>
          <RootLayoutNav />
        </StravaProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    try {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1.2,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(logoScale, {
          toValue: 1.0,
          tension: 30,
          friction: 7,
          useNativeDriver: true,
        }).start(() => {
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 0.8,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.timing(textTranslateY, {
              toValue: 0,
              duration: 650,
              useNativeDriver: true,
            }),
          ]).start(() => {
            Animated.loop(
              Animated.sequence([
                Animated.timing(logoPulse, {
                  toValue: 1.05,
                  duration: 1000,
                  useNativeDriver: true,
                }),
                Animated.timing(logoPulse, {
                  toValue: 1.0,
                  duration: 1000,
                  useNativeDriver: true,
                }),
              ])
            ).start();
          });
        });
      });
    } catch (err) {
      console.warn('[RootLayoutNav] Animation init warning:', err);
    }
  }, []);

  const animatedScale = Animated.multiply(logoScale, logoPulse);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      try {
        if (!token) {
          router.replace("/login");
        } else {
          registerForPushNotificationsAsync().catch(() => {});
          const isConfigured = user?.profile?.isConfigured === true;
          if (isConfigured) {
            router.replace("/(tabs)");
          } else {
            router.replace("/onboarding");
          }
        }
      } catch (err) {
        console.warn('[RootLayoutNav] Navigation redirect error:', err);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [token, user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.Image
          source={require('../assets/images/sidekick-logo.png')}
          style={{
            width: 250,
            height: 250,
            opacity: logoOpacity,
            transform: [{ scale: animatedScale }],
            marginBottom: 32,
          }}
          resizeMode="contain"
        />
        <Animated.Text style={{ 
          color: '#ff6b6b', 
          fontSize: 12, 
          fontWeight: '700', 
          letterSpacing: 3, 
          textTransform: 'uppercase', 
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }]
        }}>
          seu companheiro de jornada
        </Animated.Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
