import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../database/supabase';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('abdulhaseebsagri@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email to confirm.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      Alert.alert('Magic Link Sent', 'Check your email for a sign-in link.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.content}>
        <Text style={styles.title}>SnapIt</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="abdulhaseebsagri@gmail.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCompleteType="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCompleteType={isSignUp ? 'new-password' : 'password'}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleMagicLink}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                Or sign in with Magic Link (no password)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.demoText}>
          Demo: abdulhaseebsagri@gmail.com
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    padding: 16,
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 15,
  },
  spinner: {
    marginVertical: 16,
  },
  demoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
  },
});