import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Sprout } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing } from '../theme';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReport = () => {
    const { error, errorInfo } = this.state;
    const message = `${error?.message}\n\n${errorInfo?.componentStack || ''}`;
    Alert.alert(
      'Error Report',
      'Error details copied to console. Check logs for full stack trace.'
    );
    console.error('=== ERROR REPORT ===');
    console.error(message);
  };

  render() {
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.mark}>
            <Sprout size={30} color={colors.primary} strokeWidth={1.6} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error?.message || 'An unexpected error occurred'}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={this.handleReport}
            >
              <Text style={styles.buttonSecondaryText}>Report Error</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Pull down to refresh or restart the app</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textBody,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 420,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    flex: 1,
    ...shadows.soft,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    boxShadow: undefined,
    elevation: 0,
  },
  buttonText: {
    fontFamily: fonts.bodySemibold,
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonSecondaryText: {
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
