import "./globals.css";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <Toaster richColors closeButton />
        <ServiceWorkerRegister />
        </body>
    </html>
  );
}
