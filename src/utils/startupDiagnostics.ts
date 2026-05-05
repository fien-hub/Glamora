type StartupStatus = 'start' | 'ok' | 'warn' | 'error';

export type StartupTimelineEntry = {
  atMs: number;
  step: string;
  status: StartupStatus;
  details?: Record<string, unknown>;
};

const bootEpoch = Date.now();
const maxEntries = 250;
const timeline: StartupTimelineEntry[] = [];
const listeners = new Set<(entries: StartupTimelineEntry[]) => void>();

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
};

export const getStartupTimeline = () => timeline.slice();

export const subscribeToStartupTimeline = (
  listener: (entries: StartupTimelineEntry[]) => void
) => {
  listeners.add(listener);
  listener(timeline.slice());
  return () => {
    listeners.delete(listener);
  };
};
