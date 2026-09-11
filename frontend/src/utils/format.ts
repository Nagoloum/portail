const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

export function formatDateFr(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatExpiry(status: 'PENDING' | 'COMPLETE' | 'EXPIRED', expiresAtIso: string): string {
  const expiresAt = new Date(expiresAtIso);
  if (status === 'EXPIRED') {
    return `Expire le ${formatDateFr(expiresAtIso)}`;
  }
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    return `Expire aujourd'hui`;
  }
  if (days === 1) {
    return `Expire dans 1 jour`;
  }
  return `Expire dans ${days} jours`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0).replace('.', ',')} ${units[unitIndex]}`;
}
