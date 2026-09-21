'use client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import styles from './dashboard.module.css';
export default function ConnectionStatus({ connected, stale, checked }: { connected: boolean; stale: boolean; checked: number }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  const title = checked ? `${copy.updated} ${new Date(checked).toLocaleTimeString(language, { timeZone: 'Europe/Paris' })}` : copy.reconnecting;
  return <span role="status" className={styles.connection} data-state={stale ? 'stale' : connected ? 'live' : 'reconnecting'} title={title}><span aria-hidden="true">●</span> {stale ? copy.offline : connected ? copy.connected : copy.reconnectingShort}</span>;
}
