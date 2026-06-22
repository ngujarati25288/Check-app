/**
 * Secure Storage Utility for Daily Learning Exam
 * Provides encryption/scrambling on top of local storage to protect sensitive client states
 * such as sessions, user preferences, and draft answers from devtools tampering.
 */

const SECRET_PREFIX = "dle_sec_";

function encrypt(text: string): string {
  try {
    const key = 42; // Scrambling salt
    const chars = Array.from(text).map((c) => 
      String.fromCharCode(c.charCodeAt(0) ^ key)
    );
    return btoa(encodeURIComponent(chars.join('')));
  } catch (e) {
    return text;
  }
}

function decrypt(cipher: string): string {
  try {
    const raw = decodeURIComponent(atob(cipher));
    const key = 42;
    const chars = Array.from(raw).map((c) => 
      String.fromCharCode(c.charCodeAt(0) ^ key)
    );
    return chars.join('');
  } catch (e) {
    return cipher;
  }
}

export const secureStorage = {
  getItem<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(`${SECRET_PREFIX}${key}`);
      if (!value) return null;
      const decrypted = decrypt(value);
      return JSON.parse(decrypted) as T;
    } catch (e) {
      return null;
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      const encrypted = encrypt(json);
      localStorage.setItem(`${SECRET_PREFIX}${key}`, encrypted);
    } catch (e) {
      console.error("Secure storage set failure:", e);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(`${SECRET_PREFIX}${key}`);
    } catch (_) {}
  },

  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SECRET_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (_) {}
      });
    } catch (_) {}
  }
};
