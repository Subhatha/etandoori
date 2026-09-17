import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
export const buttonClass = "inline-flex items-center justify-center gap-2 rounded-full bg-ember-700 px-6 py-3 text-sm text-white transition hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-40";
export const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-[#15120f] px-4 py-3 text-base text-white outline-none focus:border-brand-400";
export default function OrderShell({ children }: { children: React.ReactNode }) {
  return <><Navbar /><main className="mx-auto min-h-[75vh] max-w-6xl px-5 pb-20 pt-32 sm:px-8">{children}</main><Footer /></>;
}
