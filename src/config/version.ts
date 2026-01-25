// App version - update this on each release
export const APP_VERSION = '1.2.0';

// Release notes for each version
export const RELEASE_NOTES: Record<string, { title: string; features: string[] }> = {
  '1.2.0': {
    title: 'Performance & Notifications Update',
    features: [
      'New app update notification system',
      'Improved loading performance with data caching',
      'Video recording for market uploads',
      'Better offline support',
    ],
  },
  '1.1.0': {
    title: 'Enhanced Reporting',
    features: [
      'New reimbursement tracking',
      'Improved stall inspection forms',
      'Better GPS accuracy',
    ],
  },
  '1.0.0': {
    title: 'Initial Release',
    features: [
      'Market session management',
      'Media uploads',
      'Attendance tracking',
      'Stall confirmations',
    ],
  },
};

// Get release notes for a version
export function getReleaseNotes(version: string) {
  return RELEASE_NOTES[version] || null;
}

// Compare versions (returns 1 if a > b, -1 if a < b, 0 if equal)
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  
  return 0;
}
