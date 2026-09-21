'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import styles from './dashboard.module.css';
export default function OrderSound({ pendingIds }: { pendingIds: string[] }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  const context = useRef<AudioContext | null>(null); const [enabled, setEnabled] = useState(false);
  const pending = pendingIds.slice().sort().join(',');
  const play = () => {
    const audio = context.current;
    if (!audio || audio.state !== 'running') return;
    for (let i = 0; i < 3; i++) {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = audio.currentTime + i * .28;
      oscillator.frequency.value = i === 1 ? 1046 : 784;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.2, start + .02); gain.gain.exponentialRampToValueAtTime(.001, start + .23);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + .25);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  };
  async function enable() {
    try {
      context.current ??= new AudioContext();
      context.current.onstatechange = () => setEnabled(context.current?.state === 'running');
      await context.current.resume(); setEnabled(context.current.state === 'running'); play();
    } catch { setEnabled(false); }
  }
  useEffect(() => {
    if (!enabled || !pending) return;
    play(); const timer = setInterval(play, 30000); return () => clearInterval(timer);
  }, [enabled, pending]);
  useEffect(() => () => { if (context.current) { context.current.onstatechange = null; void context.current.close(); } }, []);
  return <button onClick={() => void enable()} aria-label={enabled ? copy.soundOn : copy.enableSound} aria-pressed={enabled} title={copy.soundHelp} className={styles.soundButton} data-enabled={enabled}><span aria-hidden="true">{enabled ? '♪' : '♩'}</span> {enabled ? copy.soundShort : copy.soundEnableShort}</button>;
}
