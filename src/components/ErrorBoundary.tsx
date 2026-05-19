import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { navigationRef } from '../navigation/RootNavigation';

// Sentry is required lazily to prevent a module-level native-module crash
// from disabling the ErrorBoundary itself.
let SentryCapture: ((e: Error) => void) | null = null;
let SentryWithScope: ((fn: (scope: any) => void) => void) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
  if (Sentry?.captureException) SentryCapture = Sentry.captureException.bind(Sentry);
  if (Sentry?.withScope) SentryWithScope = Sentry.withScope.bind(Sentry);
} catch (e) {
  console.warn('[ErrorBoundary] Sentry failed to load:', e);
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and display fallback UI
 * Automatically reports errors to Sentry
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry (via lazy-loaded reference)
    try {
      if (SentryWithScope && SentryCapture) {
        SentryWithScope((scope: any) => {
          scope.setContext('errorInfo', { componentStack: errorInfo.componentStack });
          SentryCapture!(error);
        });
      } else if (SentryCapture) {
        SentryCapture(error);
      }
    } catch (sentryErr) {
      console.warn('[ErrorBoundary] Sentry report failed:', sentryErr);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('Error Boundary caught an error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    // Reset error state and try to navigate to home
    this.setState(
      {
        hasError: false,
        error: null,
        errorInfo: null,
      },
      () => {
        // Wait a tick for the state to update, then navigate
        setTimeout(() => {
          if (navigationRef.isReady()) {
            try {
              // Reset to the root of the navigation stack
              (navigationRef as any).reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (navError) {
              console.warn('[ErrorBoundary] Failed to navigate home:', navError);
            }
          }
        }, 100);
      }
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry for the inconvenience. The error has been reported to our team.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <>
                    <Text style={styles.errorTitle}>Component Stack:</Text>
                    <Text style={styles.errorText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleGoHome}
            >
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.error,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    minWidth: 200,
  },
  buttonText: {
    color: colors.black,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 200,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    textAlign: 'center',
  },
});

export default ErrorBoundary;

