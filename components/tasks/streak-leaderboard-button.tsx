"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LeaderRow = {
  user_id: string;
  display_name: string | null;
  coins: number;
  rank: number;
};

function shortUserId(id: string) {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

export function CoinsLeaderboardButton({
  userId,
  limit = 10,
}: {
  userId: string;
  limit?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_coins_leaderboard", {
      p_limit: limit,
    });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as LeaderRow[]);
    setLoading(false);
  }, [limit, supabase]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          void refresh();
        }}
      >
        Coins leaderboard
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div className="space-y-0.5">
                  <div className="text-sm text-muted-foreground">
                    Coins leaderboard
                  </div>
                  <div className="font-semibold">Top coins</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => void refresh()} disabled={loading}>
                    Refresh
                  </Button>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {error ? (
                  <div className="text-sm text-destructive">{error}</div>
                ) : loading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : rows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No coins yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r) => {
                      const isYou = r.user_id === userId;
                      const name =
                        r.display_name?.trim() ||
                        (isYou ? "You" : `User ${shortUserId(r.user_id)}`);
                      return (
                        <div
                          key={r.user_id}
                          className="flex items-center justify-between rounded-lg border bg-background p-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Badge variant={isYou ? "default" : "secondary"}>
                              #{r.rank}
                            </Badge>
                            <div className="truncate text-sm">
                              {name}
                            </div>
                          </div>
                          <div className="text-sm font-medium tabular-nums">
                            {r.coins}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t p-4 text-xs text-muted-foreground">
                Ranks are based on coins only.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
