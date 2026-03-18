"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/time";

type ActivityRow = {
  id: string;
  message: string;
  created_at: string;
  task?: Array<{ id: string; title: string }> | null;
};

export function GlobalHistoryButton({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("task_activities")
      .select("id,message,created_at,task:tasks(id,title)")
      .order("created_at", { ascending: false })
      .limit(200);

    setLoading(false);
    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }

    setRows(((data ?? []) as unknown) as ActivityRow[]);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={async () => {
          setOpen(true);
          await load();
        }}
      >
        History
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div className="space-y-0.5">
                  <div className="text-sm text-muted-foreground">
                    All task activity
                  </div>
                  <div className="font-semibold">History</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={load}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-auto">
                {error ? (
                  <div className="p-4 text-sm text-destructive">{error}</div>
                ) : null}

                {!error && rows.length === 0 && !loading ? (
                  <div className="p-6 text-sm text-muted-foreground">
                    No activity yet.
                  </div>
                ) : null}

                <ul className="divide-y">
                  {rows.map((a) => (
                    <li key={a.id} className="p-4 text-sm">
                      <div className="text-muted-foreground">
                        <span className="text-foreground">{a.message}</span> ·{" "}
                        {timeAgo(a.created_at)}
                      </div>
                      {a.task?.[0]?.title ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Task:{" "}
                          <span className="text-foreground">{a.task[0].title}</span>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t p-3 text-xs text-muted-foreground">
                Logged in as <span className="font-mono">{userId}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
