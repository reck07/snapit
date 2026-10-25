import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import { Lato_400Regular, Lato_600SemiBold, Lato_700Bold } from '@expo-google-fonts/lato';
import { supabase } from './src/database/supabase';
import HomeScreen from './src/screens/HomeScreen';
import AddDeviceScreen from './src/screens/AddDeviceScreen';
import DeviceHistoryScreen from './src/screens/DeviceHistoryScreen';
import AddServiceScreen from './src/screens/AddServiceScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SignInScreen from './src/screens/SignInScreen';
import { useTabLock } from './src/utils/tabLock';
import ErrorBoundary from './src/components/ErrorBoundary';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { PressableScale } from './src/components/motion';
import { colors, fonts, radii, shadows, spacing, type } from './src/theme';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.secondary,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function LockScreen({ lockInfo }) {
  const handleForceRelease = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.__snapitForceRelease) {
      window.__snapitForceRelease();
      Alert.alert(
        'Lock Released',
        'Database lock has been force-released. The app should reload automatically.'
      );
    } else {
      Alert.alert('Not Available', 'Force release only works on web platform.');
    }
  };

  return (
    <View style={styles.centered}>
      <View style={styles.lockCard}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>This tab is resting</Text>
        <Text style={styles.lockText}>
          Snap It allows one tab at a time on the web. Close the other tab, then refresh this page.
        </Text>
        {lockInfo && (
          <View style={styles.lockDebug}>
            <Text style={styles.lockDebugText}>Owner: {lockInfo.owner}</Text>
            <Text style={styles.lockDebugText}>Age: {Math.round(lockInfo.age / 1000)}s</Text>
            <Text style={styles.lockDebugText}>Timeout: 10s</Text>
          </View>
        )}
        <PressableScale
          style={styles.primaryButton}
          hoverStyle={styles.primaryButtonHover}
          onPress={handleForceRelease}
          accessibilityLabel="Force release lock"
        >
          <Text style={styles.primaryButtonText}>Force release</Text>
        </PressableScale>
        <Text style={styles.lockHint}>Or run window.__snapitForceRelease() in the console.</Text>
      </View>
    </View>
  );
}

function LoadingScreen({ fontsReady }) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingMark}>
        <Text style={styles.loadingLeaf}>🌿</Text>
      </View>
      <Text style={[styles.loadingTitle, fontsReady && { fontFamily: fonts.display }]}>Snap It</Text>
      <Text style={styles.loadingText}>{fontsReady ? 'Preparing your products…' : 'Loading…'}</Text>
      <ActivityIndicator size="small" color={colors.primary} style={styles.loadingSpinner} />
    </View>
  );
}

function AuthenticatedApp() {
  const { locked, lockInfo } = useTabLock();

  if (locked) {
    return <LockScreen lockInfo={lockInfo} />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddDevice" component={AddDeviceScreen} options={{ title: 'Add Device' }} />
      <Stack.Screen
        name="DeviceHistory"
        component={DeviceHistoryScreen}
        options={{ title: 'Device History' }}
      />
      <Stack.Screen
        name="AddService"
        component={AddServiceScreen}
        options={{ title: 'Add Service Entry' }}
      />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_600SemiBold,
    Merriweather_400Regular,
    Merriweather_700Bold,
    Lato_400Regular,
    Lato_600SemiBold,
    Lato_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || (!fontsLoaded && !fontError)) {
    return <LoadingScreen fontsReady={fontsLoaded} />;
  }

  return (
    <ErrorBoundary>
      <StatusBar style="dark" />
      <CurrencyProvider>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator screenOptions={screenOptions}>
            {session ? (
              <Stack.Screen
                name="Authenticated"
                component={AuthenticatedApp}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen
                name="SignIn"
                component={SignInScreen}
                options={{ headerShown: false }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </CurrencyProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  loadingMark: {
    width: 76,
    height: 76,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  loadingLeaf: {
    fontSize: 34,
  },
  loadingTitle: {
    fontSize: 34,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  loadingSpinner: {
    marginTop: spacing.lg,
  },
  lockCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.medium,
  },
  lockIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  lockTitle: {
    ...type.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  lockText: {
    ...type.body,
    textAlign: 'center',
    color: colors.textBody,
  },
  lockDebug: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    width: '100%',
  },
  lockDebugText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 12,
    color: colors.danger,
    marginBottom: 2,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.md,
    ...shadows.soft,
  },
  primaryButtonHover: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    ...type.button,
    color: colors.white,
  },
  lockHint: {
    ...type.small,
    fontSize: 12,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
