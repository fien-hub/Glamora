type StartupStatus = 'start' | 'ok' | 'warn' | 'error';

export type StartupTimelineEntry = {
  atMs: number;
  step: string;
  status: StartupStatus;
  details?: Record<string, unknown>;
};

const bootEpoch = Date.now();
const maxEntries = 250;
const persistEntries = 80;
const startupTraceStorageKey = 'glamora_startup_trace_v1';
const timeline: StartupTimelineEntry[] = [];
const listeners = new Set<(entries: StartupTimelineEntry[]) => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const schedulePersist = () => {
  if (persistTimer) {
    return;
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;

    // Lazy require keeps startup diagnostics non-blocking if AsyncStorage has
    // a native-linking issue in release builds.
    const writeTrace = async () => {
      try {
        const asyncStorageModule = require('@react-native-async-storage/async-storage') as {
          default?: {
            setItem: (key: string, value: string) => Promise<void>;
          };
        };
        const storage = asyncStorageModule?.default;
        if (!storage?.setItem) {
          return;
        }

        await storage.setItem(
          startupTraceStorageKey,
          JSON.stringify(timeline.slice(-persistEntries))
        );
      } catch {
        // Best-effort only. Never break app startup on diagnostics persistence.
      }
    };

    void writeTrace();
  }, 250);
};

const notify = () => {
  const snapshot = timeline.slice();
  listeners.forEach((listener) => listener(snapshot));
};

export const recordStartupCheckpoint = (
  step: string,
  status: StartupStatus,
  details?: Record<string, unknown>
) => {
  const entry: StartupTimelineEntry = {
    atMs: Date.now() - bootEpoch,
    step,
    status,
    details,
  };

  timeline.push(entry);
  if (timeline.length > maxEntries) {
    timeline.shift();
  }

  const label = `[StartupTrace] +${entry.atMs}ms ${step} :: ${status}`;
  if (status === 'error') {
    console.error(label, details ?? '');
  } else if (status === 'warn') {
    console.warn(label, details ?? '');
  } else {
    console.log(label, details ?? '');
  }

  notify();
  schedulePersist();
};

export const getStartupTimeline = () => timeline.slice();

export const getStartupTraceStorageKey = () => startupTraceStorageKey;

export const subscribeToStartupTimeline = (
  listener: (entries: StartupTimelineEntry[]) => void
) => {
  listeners.add(listener);
  listener(timeline.slice());
  return () => {
    listeners.delete(listener);
  };
};
