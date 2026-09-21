/** Visual wait indicators only; these thresholds never affect order lifecycle. */
export function orderAge(createdAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60000));
  return { minutes, urgency: minutes >= 20 ? 'late' : minutes >= 10 ? 'waiting' : 'normal' } as const;
}
