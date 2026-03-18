export type DailyMetaV1 = {
  version: 1;
  dailyTaskIds: string[];
  completedByDate: Record<string, string[]>;
  xp: number;
  streak: number;
  lastAwardDate: string | null;
  reminderAt: number | null;
  reminderForDate: string | null;
};

export type DailyMeta = DailyMetaV1;

const DAILY_META_VERSION = 1 as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string");
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function localDateKey(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function localDateKeyOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

export function dailyMetaStorageKey(userId: string) {
  return `nextplay.dailyMeta.v${DAILY_META_VERSION}:${userId}`;
}

export function defaultDailyMeta(): DailyMeta {
  return {
    version: DAILY_META_VERSION,
    dailyTaskIds: [],
    completedByDate: {},
    xp: 0,
    streak: 0,
    lastAwardDate: null,
    reminderAt: null,
    reminderForDate: null,
  };
}

export function loadDailyMeta(userId: string): DailyMeta {
  if (typeof window === "undefined") return defaultDailyMeta();

  const key = dailyMetaStorageKey(userId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return defaultDailyMeta();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return defaultDailyMeta();
    if (parsed.version !== DAILY_META_VERSION) return defaultDailyMeta();

    const completedByDate: Record<string, string[]> = {};
    if (isRecord(parsed.completedByDate)) {
      for (const [k, v] of Object.entries(parsed.completedByDate)) {
        completedByDate[k] = asStringArray(v);
      }
    }

    return {
      version: DAILY_META_VERSION,
      dailyTaskIds: asStringArray(parsed.dailyTaskIds),
      completedByDate,
      xp: asNumber(parsed.xp, 0),
      streak: asNumber(parsed.streak, 0),
      lastAwardDate: asStringOrNull(parsed.lastAwardDate),
      reminderAt: asNumberOrNull(parsed.reminderAt),
      reminderForDate: asStringOrNull(parsed.reminderForDate),
    };
  } catch {
    return defaultDailyMeta();
  }
}

export function saveDailyMeta(userId: string, meta: DailyMeta) {
  if (typeof window === "undefined") return;
  const key = dailyMetaStorageKey(userId);
  window.localStorage.setItem(key, JSON.stringify(meta));
  // Dispatch asynchronously to avoid setState-during-render warnings when a
  // different component updates localStorage while React is rendering.
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("nextplay:daily-meta-updated", { detail: { userId } }),
    );
  }, 0);
}

export function pruneDailyMeta(meta: DailyMeta, existingTaskIds: Set<string>) {
  const dailyTaskIds = meta.dailyTaskIds.filter((id) => existingTaskIds.has(id));
  if (dailyTaskIds.length === meta.dailyTaskIds.length) return meta;

  const completedByDate: Record<string, string[]> = {};
  for (const [dateKey, ids] of Object.entries(meta.completedByDate)) {
    const pruned = ids.filter((id) => existingTaskIds.has(id));
    if (pruned.length > 0) completedByDate[dateKey] = pruned;
  }

  return { ...meta, dailyTaskIds, completedByDate };
}

export function xpLevelInfo(xp: number) {
  const xpPerLevel = 100;
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const withinLevel = safeXp % xpPerLevel;
  const progressPct = (withinLevel / xpPerLevel) * 100;
  return { level, xpPerLevel, withinLevel, progressPct, totalXp: safeXp };
}
