const ADMIN_KEY_STORAGE_KEY = "unibite.admin.apiKey";
const ADMIN_LAST_ACTIVITY_STORAGE_KEY = "unibite.admin.lastActivityAt";
export const ADMIN_SESSION_INVALIDATED_EVENT =
  "unibite.admin.session-invalidated";
export const ADMIN_SESSION_TIMEOUT_MS = 1000 * 60 * 20;

function getLastActivityAt() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue =
    window.localStorage.getItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY) ?? "";
  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function isSessionExpired() {
  return Date.now() - getLastActivityAt() > ADMIN_SESSION_TIMEOUT_MS;
}

export function hasActiveAdminSession() {
  if (typeof window === "undefined") {
    return false;
  }

  const key = window.localStorage.getItem(ADMIN_KEY_STORAGE_KEY);
  if (!key) {
    return false;
  }

  if (isSessionExpired()) {
    clearStoredAdminKey();
    return false;
  }

  return true;
}

export function getStoredAdminKey() {
  if (typeof window === "undefined") {
    return "";
  }

  if (!hasActiveAdminSession()) {
    return "";
  }

  return window.localStorage.getItem(ADMIN_KEY_STORAGE_KEY) ?? "";
}

export function setStoredAdminKey(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_KEY_STORAGE_KEY, value);
  window.localStorage.setItem(
    ADMIN_LAST_ACTIVITY_STORAGE_KEY,
    String(Date.now()),
  );
}

export function touchAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.localStorage.getItem(ADMIN_KEY_STORAGE_KEY)) {
    return;
  }

  window.localStorage.setItem(
    ADMIN_LAST_ACTIVITY_STORAGE_KEY,
    String(Date.now()),
  );
}

export function clearStoredAdminKey() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
  window.localStorage.removeItem(ADMIN_LAST_ACTIVITY_STORAGE_KEY);
}

export function notifyAdminSessionInvalidated(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ADMIN_SESSION_INVALIDATED_EVENT, {
      detail: { message },
    }),
  );
}

export function expireAdminSession(message: string) {
  clearStoredAdminKey();
  notifyAdminSessionInvalidated(message);
}
