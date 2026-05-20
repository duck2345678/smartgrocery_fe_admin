const FINGERPRINT_KEY = 'SG_ADMIN_DEVICE_FINGERPRINT';

const getStoredFingerprint = (): string | null => {
  try {
    return localStorage.getItem(FINGERPRINT_KEY);
  } catch {
    return null;
  }
};

const setStoredFingerprint = (value: string): void => {
  try {
    localStorage.setItem(FINGERPRINT_KEY, value);
  } catch {
    // Ignore storage failures and fall back to the generated value for this session.
  }
};

const generateFingerprint = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getDeviceFingerprint = (): string => {
  const existing = getStoredFingerprint();
  if (existing) return existing;

  const fingerprint = generateFingerprint();
  setStoredFingerprint(fingerprint);
  return fingerprint;
};