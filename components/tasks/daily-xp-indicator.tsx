"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { xpLevelInfo } from "@/lib/daily";
import { cn } from "@/lib/utils";
import {
  userStatsUpdatedEventName,
  type UserStatsRow,
} from "@/lib/user-stats";

export function DailyXpIndicator({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<UserStatsRow | null>(null);

  useEffect(() => {
    let canceled = false;

    async function load() {
      const { data, error } = await supabase
        .from("user_stats")
        .select("user_id,coins,streak,last_award_reminder_ms,updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (canceled) return;

      if (error) {
        setStats(null);
        return;
      }

      if (!data) {
        const { error: insertError } = await supabase.from("user_stats").insert({
          user_id: userId,
          coins: 0,
          streak: 0,
          last_award_reminder_ms: null,
        });
        if (!canceled && !insertError) {
          setStats({
            user_id: userId,
            coins: 0,
            streak: 0,
            last_award_reminder_ms: null,
            updated_at: new Date().toISOString(),
          });
        }
        return;
      }

      setStats(data as UserStatsRow);
    }

    function onCustom(e: Event) {
      const ce = e as CustomEvent<{ userId?: string }>;
      if (ce.detail?.userId !== userId) return;
      void load();
    }

    void load();
    window.addEventListener(userStatsUpdatedEventName(), onCustom);
    return () => {
      canceled = true;
      window.removeEventListener(userStatsUpdatedEventName(), onCustom);
    };
  }, [supabase, userId]);

  const info = useMemo(() => xpLevelInfo(stats?.coins ?? 0), [stats?.coins]);
  const streak = stats?.streak ?? 0;

  return (
    <div
      className={cn(
        "items-center gap-3 rounded-md border bg-card px-3 py-2",
        className ?? "hidden sm:flex",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Coins</span>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="How to get coins"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[10px] leading-none text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span aria-hidden>?</span>
              </button>
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border bg-background px-2 py-1 text-xs text-foreground shadow-sm opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                To get coins, complete all tasks in Daily Tasks before the timer is
                up (check them all off).
              </span>
            </span>
          </div>
          <span className="tabular-nums">{info.totalXp} coins</span>
        </div>
        <div className="mt-1 h-2 w-28 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${info.progressPct}%` }}
          />
        </div>
      </div>
      <div className="border-l pl-3">
        <div className="text-xs text-muted-foreground">Streak</div>
        <div className="font-semibold tabular-nums">{streak}</div>
      </div>
    </div>
  );
}
