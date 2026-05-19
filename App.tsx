import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { recordStartupCheckpoint } from './src/utils/startupDiagnostics';
import AppRuntime from './src/AppRuntime';

// Keep the native splash screen visible until we explicitly hide it.
// This prevents a white flash between the native splash and first React frame.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or not supported — safe to ignore.
});

type BootstrapErrorProps = {
  error: unknown;
};

function BootstrapErrorScreen({ error }: BootstrapErrorProps) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scrollView}>
      <Text style={styles.title}>Startup failed before React navigation mounted</Text>
      <Text style={styles.body}>
        This usually means a production-only module import or native bridge call threw during app bootstrap.
      </Text>
      <Text style={styles.label}>Platform</Text>
      <Text style={styles.value}>{Platform.OS}</Text>
      <Text style={styles.label}>Error</Text>
      <Text style={styles.value}>{message}</Text>
      {stack ? (
        <>
          <Text style={styles.label}>Stack</Text>
          <Text style={styles.stack}>{stack}</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function BootstrapLoadingScreen() {
  // Intentionally blank white screen — the native splash is still visible
  // at this point (preventAutoHideAsync keeps it up). Users never see this.
  return <View style={styles.blank} />;
}

type BootstrapBoundaryState = {
  error: unknown;
};

class BootstrapBoundary extends React.Component<React.PropsWithChildren, BootstrapBoundaryState> {
  state: BootstrapBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: unknown): BootstrapBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error('[Bootstrap] Root startup failure', error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.flex}>
          <BootstrapErrorScreen error={this.state.error} />
        </View>
      );
    }

    return this.props.children;
  }
}

function RuntimeHost() {
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;
    recordStartupCheckpoint('App.bootstrap.loadRuntime.start', 'start');

    const initializeRuntime = () => {
      try {
        if (typeof AppRuntime !== 'function') {
          throw new Error(`AppRuntime is not a valid component (type: ${typeof AppRuntime})`);
        }
        if (isMounted) {
          setIsReady(true);
          recordStartupCheckpoint('App.bootstrap.loadRuntime.success', 'ok');
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error);
          recordStartupCheckpoint('App.bootstrap.loadRuntime.error', 'error', {
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    // Defer by one tick so we always render at least one frame before
    // trying to mount the runtime (avoids a synchronous throw blocking paint).
    const bootstrapHandle = setTimeout(initializeRuntime, 0);

    return () => {
      isMounted = false;
      clearTimeout(bootstrapHandle);
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      // Hide the native splash now that the app tree is ready to render.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  useEffect(() => {
    // Hard failsafe: force-hide the native splash after 3 seconds regardless
    // of ready state. Prevents any future regression from keeping the splash
    // frozen indefinitely if something unexpected blocks the normal hide path.
    const failsafe = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(failsafe);
  }, []);

  if (loadError) {
    // Hide splash even on error so the user sees the error screen.
    SplashScreen.hideAsync().catch(() => {});
    return <BootstrapErrorScreen error={loadError} />;
  }

  if (!isReady) {
    return <BootstrapLoadingScreen />;
  }

  return <AppRuntime />;
}

export default function App() {
  return (
    <BootstrapBoundary>
      <RuntimeHost />
    </BootstrapBoundary>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  blank: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#10131A',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 48,
    backgroundColor: '#10131A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    color: '#C7D2E0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: {
    color: '#7DD3FC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  value: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 21,
  },
  stack: {
    color: '#F8FAFC',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});

