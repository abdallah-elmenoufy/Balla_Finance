import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100">
      <Nav />
      <main className="md:pl-60 pb-24 md:pb-10 print:pl-0 print:pb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
