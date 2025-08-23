"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // console.log("SW registered");
      } catch (e) {
        console.warn("SW register failed:", e);
      }
    };
    register();
  }, []);

  return null;
}
