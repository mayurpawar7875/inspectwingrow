import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, compareVersions, getReleaseNotes } from '@/config/version';

const LAST_SEEN_VERSION_KEY = 'wingrow_last_seen_version';

interface VersionCheckState {
  isNewVersion: boolean;
  currentVersion: string;
  lastSeenVersion: string | null;
  releaseNotes: { title: string; features: string[] } | null;
}

export function useVersionCheck() {
  const [state, setState] = useState<VersionCheckState>({
    isNewVersion: false,
    currentVersion: APP_VERSION,
    lastSeenVersion: null,
    releaseNotes: null,
  });

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    
    // Check if this is a new version
    const isNew = !lastSeenVersion || compareVersions(APP_VERSION, lastSeenVersion) > 0;
    const notes = isNew ? getReleaseNotes(APP_VERSION) : null;

    setState({
      isNewVersion: isNew,
      currentVersion: APP_VERSION,
      lastSeenVersion,
      releaseNotes: notes,
    });
  }, []);

  const acknowledgeVersion = useCallback(() => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION);
    setState(prev => ({
      ...prev,
      isNewVersion: false,
      lastSeenVersion: APP_VERSION,
    }));
  }, []);

  return {
    ...state,
    acknowledgeVersion,
  };
}
