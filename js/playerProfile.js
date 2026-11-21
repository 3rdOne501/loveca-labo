import { STORAGE_PLAYER_DISPLAY_NAME } from "./config.js";
import { getCurrentCloudUser } from "./cloudAuth.js";

/** @returns {string} */
export function getPlayerDisplayName() {
  try {
    const v = localStorage.getItem(STORAGE_PLAYER_DISPLAY_NAME);
    if (v && String(v).trim()) return String(v).trim().slice(0, 32);
  } catch (_) {
    /* noop */
  }
  const u = getCurrentCloudUser();
  if (u && u.displayName && String(u.displayName).trim()) {
    return String(u.displayName).trim().slice(0, 32);
  }
  if (u && u.email) return String(u.email).split("@")[0].slice(0, 32);
  return "";
}

/** @param {string} name */
export function setPlayerDisplayName(name) {
  try {
    const v = String(name || "").trim().slice(0, 32);
    if (v) localStorage.setItem(STORAGE_PLAYER_DISPLAY_NAME, v);
    else localStorage.removeItem(STORAGE_PLAYER_DISPLAY_NAME);
  } catch (_) {
    /* noop */
  }
}
