import Link from "next/link";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7faf9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-ink">
            Country Stock Sheet Digitizer
          </Link>
          <Link
            href="/documents/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            New document
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
