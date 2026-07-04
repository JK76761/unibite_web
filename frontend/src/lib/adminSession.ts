const ADMIN_KEY_STORAGE_KEY = "unibite.admin.apiKey";
export const ADMIN_SESSION_INVALIDATED_EVENT =
  "unibite.admin.session-invalidated";

export function getStoredAdminKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_KEY_STORAGE_KEY) ?? "";
}

export function setStoredAdminKey(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_KEY_STORAGE_KEY, value);
}

export function clearStoredAdminKey() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
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
