import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'eTandoori · Restaurant', robots: { index: false, follow: false },
  manifest: `${process.env.NODE_ENV === 'production' ? '/etandoori' : ''}/admin/manifest.webmanifest/`,
  appleWebApp: { capable: true, title: 'eTandoori', statusBarStyle: 'black-translucent' },
};
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
