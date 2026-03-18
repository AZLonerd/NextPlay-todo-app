export type UserStatsRow = {
  user_id: string;
  coins: number;
  streak: number;
  last_award_date?: string | null;
  last_award_reminder_ms: number | null;
  updated_at: string;
};

export function userStatsUpdatedEventName() {
  return "nextplay:user-stats-updated" as const;
}

export function dispatchUserStatsUpdated(userId: string) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent(userStatsUpdatedEventName(), { detail: { userId } }),
    );
  }, 0);
}
