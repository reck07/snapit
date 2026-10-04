import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/database/supabase';
import HomeScreen from './src/screens/HomeScreen';
import AddDeviceScreen from './src/screens/AddDeviceScreen';
import DeviceHistoryScreen from './src/screens/DeviceHistoryScreen';
import AddServiceScreen from './src/screens/AddServiceScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SignInScreen from './src/screens/SignInScreen';
import { useTabLock } from './src/utils/tabLock';

const Stack = createNativeStackNavigator();

function LockScreen({ lockInfo }) {
  const handleForceRelease = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.__snapitForceRelease) {
      window.__snapitForceRelease();
      Alert.alert('Lock Released', 'Database lock has been force-released. The app should reload automatically.');
    } else {
      Alert.alert('Not Available', 'Force release only works on web platform.');
    }
  };

  return (
    <View style={styles.lockContainer}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.lockTitle}>Database is open in another tab</Text>
      <Text style={styles.lockText}>
        This app allows only one tab at a time on the web. Close the other Snap It
        tab, then refresh this page.
      </Text>
      {lockInfo && (
        <View style={styles.lockDebug}>
          <Text style={styles.lockDebugText}>Lock owner: {lockInfo.owner}</Text>
          <Text style={styles.lockDebugText}>Lock age: {Math.round(lockInfo.age / 1000)}s</Text>
          <Text style={styles.lockDebugText}>Timeout: 10s</Text>
        </View>
      )}
      <TouchableOpacity style={styles.forceButton} onPress={handleForceRelease}>
        <Text style={styles.forceButtonText}>🔓 Force Release Lock</Text>
      </TouchableOpacity>
      <Text style={styles.lockHint}>
        Or open browser console and run: window.__snapitForceRelease()
      </Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function AuthenticatedApp({ navigation }) {
  const { locked, lockInfo } = useTabLock();

  if (locked) {
    return <LockScreen lockInfo={lockInfo} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#007AFF',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Snap It' }}
      />
      <Stack.Screen
        name="AddDevice"
        component={AddDeviceScreen}
        options={{ title: 'Add Device' }}
      />
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
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#007AFF',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  lockContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  lockDebug: {
    backgroundColor: '#fff3f3',
    borderRadius: 10,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#f5c6c6',
    alignItems: 'center',
  },
  lockDebugText: {
    fontSize: 12,
    color: '#c0392b',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  forceButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 16,
  },
  forceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lockHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});