import { redirect } from "next/navigation";
import { Suspense } from "react";

import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { Task } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/server";

type DailyTaskRow = {
  id: string;
  task_id: string;
  checked: boolean;
  checked_date: string | null;
};

export default async function ProtectedPage() {
  return (
    <Suspense fallback={<div className="w-full text-sm text-muted-foreground">Loading…</div>}>
      <ProtectedPageInner />
    </Suspense>
  );
}

async function ProtectedPageInner() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = (data.claims.sub ?? data.claims.user_id) as string | undefined;
  if (!userId) {
    redirect("/auth/login");
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      "id,title,description,status,priority,tags,initial_comment,due_date,assigned_to,created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: dailyTasks, error: dailyTasksError } = await supabase
    .from("daily_tasks")
    .select("id,task_id,checked,checked_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const dbError = tasksError ?? dailyTasksError;

  return (
    <div className="w-full">
      {dbError ? (
        <div className="rounded-xl border bg-card p-6">
          <div className="text-lg font-semibold">Database not ready</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Create the <code className="font-mono">tasks</code> and{" "}
            <code className="font-mono">daily_tasks</code> tables in Supabase first.
          </p>
          <p className="mt-2 text-sm">
            Run <code className="font-mono">supabase/tasks.sql</code> in the
            Supabase SQL editor, then refresh this page.
          </p>
          <pre className="mt-4 overflow-auto rounded-md border bg-background p-3 text-xs text-muted-foreground">
            {dbError.message}
          </pre>
        </div>
      ) : (
        <KanbanBoard
          initialTasks={(tasks ?? []) as Task[]}
          initialDailyTasks={(dailyTasks ?? []) as DailyTaskRow[]}
          userId={userId}
        />
      )}
    </div>
  );
}
