// How long a loading screen stays visible, in milliseconds (5000 = 5 seconds)
export const LOADING_MIN_MS = 5000;

// Waits for the real data AND for the minimum loading time, whichever is longer
export async function withMinimumLoading<T>(
  work: Promise<T>,
  ms: number = LOADING_MIN_MS,
): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
  return result;
}

// Remembers which screens already showed their loading screen this session,
// so the 5 seconds only happen the first time each screen opens
const shown = new Set<string>();

export function hasShownLoading(name: string) {
  return shown.has(name);
}

export function markLoadingShown(name: string) {
  shown.add(name);
}

export function resetLoadingShown() {
  shown.clear();
}
