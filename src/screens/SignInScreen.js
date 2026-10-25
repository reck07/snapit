import { useState } from 'react';
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
import { LockKeyhole, Mail, Sprout } from 'lucide-react-native';
import { supabase } from '../database/supabase';
import { OrganicBackdrop, PressableScale } from '../components/motion';
import { colors, fonts, radii, shadows, spacing, type } from '../theme';

export default function SignInScreen() {
  const [email, setEmail] = useState(process.env.EXPO_PUBLIC_DEMO_EMAIL || '');
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Please check your email to confirm.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // App.js switches to the authenticated stack automatically when the session changes
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
      <OrganicBackdrop />
      <View style={styles.content}>
        <View style={styles.mark}>
          <Sprout size={28} color={colors.primary} strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>Snap It</Text>
        <Text style={styles.tagline}>A quiet memory for everything you own</Text>

        <View style={styles.card}>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Mail size={17} color={colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <LockKeyhole size={17} color={colors.muted} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          ) : (
            <>
              <PressableScale
                style={styles.primaryButton}
                hoverStyle={styles.primaryButtonHover}
                onPress={handleAuth}
                disabled={loading}
                accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
              >
                <Text style={styles.buttonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              </PressableScale>

              <PressableScale
                style={styles.secondaryButton}
                hoverStyle={styles.secondaryButtonHover}
                onPress={handleMagicLink}
                disabled={loading}
                accessibilityLabel="Sign in with magic link"
              >
                <Text style={styles.secondaryButtonText}>Sign in with a magic link</Text>
              </PressableScale>

              <TouchableOpacity style={styles.toggleButton} onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.demoText}>Demo account prefilled · use your Snap It password</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 48,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  tagline: {
    ...type.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.medium,
  },
  subtitle: {
    ...type.h3,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...type.label,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  primaryButtonHover: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    ...type.button,
    color: colors.white,
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: radii.full,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  secondaryButtonHover: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...type.button,
    color: colors.primary,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  toggleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textBody,
    textAlign: 'center',
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  demoText: {
    ...type.small,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
