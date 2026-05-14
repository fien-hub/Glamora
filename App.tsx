import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getStartupTimeline,
  recordStartupCheckpoint,
  subscribeToStartupTimeline,
} from './src/utils/startupDiagnostics';
import AppRuntime from './src/AppRuntime';

type BootstrapErrorProps = {
  error: unknown;
};

type RuntimeComponentType = React.ComponentType<Record<string, never>>;

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

function BootstrapLoadingScreen({ timedOut }: { timedOut: boolean }) {
  const [timeline, setTimeline] = useState(getStartupTimeline);

  useEffect(() => {
    const unsubscribe = subscribeToStartupTimeline(setTimeline);
    return unsubscribe;
  }, []);

  const latestEntries = useMemo(() => timeline.slice(-8), [timeline]);

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scrollView}>
      <Text style={styles.title}>Starting Glamora</Text>
      <Text style={styles.body}>
        {timedOut
          ? 'Startup is taking longer than expected. The app is running in protected boot mode.'
          : 'Preparing the app runtime...'}
      </Text>
      <Text style={styles.label}>Boot status</Text>
      <Text style={styles.value}>{timedOut ? 'Protected timeout reached' : 'Loading runtime module'}</Text>
      <Text style={styles.label}>Recent checkpoints</Text>
      {latestEntries.length === 0 ? (
        <Text style={styles.value}>No checkpoints yet</Text>
      ) : (
        latestEntries.map((entry) => (
          <Text key={`${entry.atMs}-${entry.step}`} style={styles.stack}>
            {`+${entry.atMs}ms ${entry.step} :: ${entry.status}`}
          </Text>
        ))
      )}
    </ScrollView>
  );
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
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    recordStartupCheckpoint('App.bootstrap.loadRuntime.start', 'start');

    const timeout = setTimeout(() => {
      if (!isMounted || isReady) {
        return;
      }
      setLoadTimedOut(true);
      recordStartupCheckpoint('App.bootstrap.loadRuntime.timeout', 'warn', {
        timeoutMs: 4500,
      });
    }, 4500);

    const initializeRuntime = () => {
      try {
        // Static import already loaded at top of file
        // Just verify AppRuntime is valid
        if (typeof AppRuntime !== 'function') {
          throw new Error(`AppRuntime is not a valid component (type: ${typeof AppRuntime})`);
        }

        if (isMounted) {
          setIsReady(true);
          setLoadTimedOut(false);
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

    // Defer by one tick so we always render at least one frame and avoid
    // looking like a native splash deadlock if runtime import is slow.
    const bootstrapHandle = setTimeout(initializeRuntime, 0);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearTimeout(bootstrapHandle);
    };
  }, []);

  if (loadError) {
    return <BootstrapErrorScreen error={loadError} />;
  }

  if (!isReady) {
    return <BootstrapLoadingScreen timedOut={loadTimedOut} />;
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

