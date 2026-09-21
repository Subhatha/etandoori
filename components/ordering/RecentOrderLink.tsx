'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { parseSavedOrders, subscribeTracking, trackingSnapshot } from '@/lib/ordering/tracking-storage';
import { trackingCopy } from '@/lib/ordering/tracking-copy';
export default function RecentOrderLink() {
  const raw = useSyncExternalStore(subscribeTracking, trackingSnapshot, () => '');
  const { language } = useLanguage();
  if (!parseSavedOrders(raw).length) return null;
  return <Link href="/order-confirmation" className="inline-flex min-h-11 items-center rounded-full border border-brand-500/40 px-5 py-3 text-sm text-brand-300">{trackingCopy[language].link}</Link>;
}
