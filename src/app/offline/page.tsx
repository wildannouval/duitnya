export default function OfflinePage() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Kamu sedang offline</h1>
        <p className="mt-2 text-muted-foreground">
          Beberapa data tidak tersedia. Coba sambungkan internet lalu refresh halaman.
        </p>
      </div>
    </main>
  );
}
