/** Photos and event data are deleted this many days after the reveal. */
export const RETENTION_DAYS = 30;

export const expiresAt = (ev: { revealAt: string }) =>
  new Date(new Date(ev.revealAt).getTime() + RETENTION_DAYS * 86400_000).toISOString();
