"use client";
// lib/dummyAuth.js
export const DUMMY_KEY = "DUMMY_USER";

export function isDummyEnabled() {
  return process.env.NEXT_PUBLIC_DUMMY_AUTH === "true";
}

export function setDummyUser(payload) {
  // payload: { email, role, name, password_set:true }
  localStorage.setItem(DUMMY_KEY, JSON.stringify(payload));
}

export function getDummyUser() {
  try {
    const raw = localStorage.getItem(DUMMY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearDummyUser() {
  localStorage.removeItem(DUMMY_KEY);
}
