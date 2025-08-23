"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InstallPWAButton() {
  const [deferred, setDeferred] = React.useState<any>(null);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setSupported(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as any);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt as any);
  }, []);

  const onInstall = async () => {
    if (!deferred) {
      toast.info("Jika tombol tidak muncul, coba buka dari Chrome/Edge di Android.");
      return;
    }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      toast.success("Aplikasi terpasang 🎉");
      setDeferred(null);
      setSupported(false);
    } else {
      toast("Pemasangan dibatalkan");
    }
  };

  // Selalu tampilkan tombol — biar juga jalan di iOS (Add to Homescreen manual)
  return (
    <Button variant="outline" onClick={onInstall} title="Install Aplikasi">
      Install App
    </Button>
  );
}
