import LiveTimerModule from './src/LiveTimerModule';

/** Lock-screen countdown notification (Android). No-op where unavailable. */
export function showLiveTimer(
  id: number,
  title: string,
  body: string,
  endsAt: Date,
  options: { removeAtEnd: boolean },
): boolean {
  return LiveTimerModule?.show(id, title, body, endsAt.getTime(), options.removeAtEnd) ?? false;
}

export function cancelLiveTimer(id: number): void {
  LiveTimerModule?.cancel(id);
}
