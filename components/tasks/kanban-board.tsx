"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MessageSquare, MoreHorizontal, Plus } from "lucide-react";
import {
  KANBAN_COLUMNS,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";
import {
  loadDailyMeta,
  localDateKey,
  saveDailyMeta,
  type DailyMeta,
} from "@/lib/daily";
import { dispatchUserStatsUpdated, type UserStatsRow } from "@/lib/user-stats";
import { cn } from "@/lib/utils";
import { TaskEditor } from "@/components/tasks/task-editor";

function formatDate(yyyyMmDd: string | null) {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function parseTags(input: string): string[] {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 12);
}

const COINS_PER_DAILY_TASK = Math.floor(7 + Math.random() * 4);
const STREAK_INCREMENT = 1;
const COMMENT_BUTTON_STATUSES = new Set<TaskStatus>([
  "todo",
  "in_progress",
  "in_review",
]);

type DailyTaskRow = {
  id: string;
  task_id: string;
  checked: boolean;
  checked_date: string | null;
};

type TaskCommentRow = {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
};

function statusTitle(status: TaskStatus | null | undefined) {
  const key = (status ?? "todo") as TaskStatus;
  return KANBAN_COLUMNS.find((c) => c.key === key)?.title ?? "To Do";
}

export function KanbanBoard({
  initialTasks,
  initialDailyTasks,
  userId,
}: {
  initialTasks: Task[];
  initialDailyTasks: DailyTaskRow[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyTaskRow[]>(initialDailyTasks);

  const [dailyMeta, setDailyMeta] = useState<DailyMeta>(() =>
    loadDailyMeta(userId),
  );
  const tasksRef = useRef<Task[]>(initialTasks);
  const dailyRowsRef = useRef<DailyTaskRow[]>(initialDailyTasks);
  const dailyMetaRef = useRef<DailyMeta>(dailyMeta);
  const awardInFlightRef = useRef(false);
  const [reminderHours, setReminderHours] = useState("0");
  const [reminderMinutes, setReminderMinutes] = useState("30");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderMissingTitles, setReminderMissingTitles] = useState<string[]>(
    [],
  );
  const [congratsOpen, setCongratsOpen] = useState(false);
  const [congratsText, setCongratsText] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newIsDaily, setNewIsDaily] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [commentViewId, setCommentViewId] = useState<string | null>(null);
  const [commentRows, setCommentRows] = useState<TaskCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingId) ?? null,
    [editingId, tasks],
  );

  const commentViewTask = useMemo(
    () => tasks.find((t) => t.id === commentViewId) ?? null,
    [commentViewId, tasks],
  );

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    dailyRowsRef.current = dailyRows;
  }, [dailyRows]);

  useEffect(() => {
    dailyMetaRef.current = dailyMeta;
  }, [dailyMeta]);

  const refreshDaily = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_tasks")
      .select("id,task_id,checked,checked_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setDailyRows((data ?? []) as DailyTaskRow[]);
  }, [supabase, userId]);

  useEffect(() => {
    setDailyMeta(loadDailyMeta(userId));
    void refreshDaily();
  }, [refreshDaily, userId]);

  const dailyTaskIds = useMemo(() => {
    return new Set(dailyRows.map((r) => r.task_id));
  }, [dailyRows]);

  useEffect(() => {
    if (!commentViewId) return;
    const task = tasksRef.current.find((t) => t.id === commentViewId) ?? null;
    if (!task) return;
    setCommentsLoading(true);
    setCommentsError(null);
    setCommentDraft("");
    void (async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("id,task_id,user_id,body,created_at")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });

      if (error) {
        setCommentsError(error.message);
        setCommentRows([]);
      } else {
        setCommentRows((data ?? []) as TaskCommentRow[]);
      }
      setCommentsLoading(false);
    })();
  }, [commentViewId, supabase]);

  const addComment = useCallback(async () => {
    if (!commentViewTask) return;
    const body = commentDraft.trim();
    if (!body) return;
    setCommentsError(null);

    const { data, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: commentViewTask.id,
        user_id: userId,
        body,
      })
      .select("id,task_id,user_id,body,created_at")
      .single();

    if (error) {
      if (
        error.message.includes("row-level security") &&
        error.message.includes('"task_comments"')
      ) {
        setCommentsError(
          "Couldn’t add comment (blocked by database permissions). Re-run supabase/tasks.sql to apply the task_comments RLS policies.",
        );
      } else {
        setCommentsError(error.message);
      }
      return;
    }

    setCommentRows((prev) => [...prev, data as TaskCommentRow]);
    setCommentDraft("");
  }, [commentDraft, commentViewTask, supabase, userId]);

  const updateDailyMeta = useCallback(
    (updater: (m: DailyMeta) => DailyMeta) => {
      setDailyMeta((prev) => {
        const next = updater(prev);
        saveDailyMeta(userId, next);
        return next;
      });
    },
    [userId],
  );

  async function refresh() {
    setError(null);
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,tags,initial_comment,due_date,assigned_to,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setTasks((data ?? []) as Task[]);
  }

  async function createTask() {
    setError(null);
    const title = newTitle.trim();
    if (!title) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: newDescription.trim() ? newDescription.trim() : null,
        initial_comment: null,
        due_date: newDueDate || null,
        priority: "normal",
        tags: parseTags(newTags),
        status: "todo" satisfies TaskStatus,
        user_id: userId,
        assigned_to: null,
      })
      .select("id")
      .single();

    setCreating(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data?.id) {
      await supabase.from("task_activities").insert({
        task_id: data.id,
        actor_id: userId,
        message: "Created task",
      });

      if (newIsDaily) {
        const { error: dailyError } = await supabase.from("daily_tasks").upsert(
          {
            user_id: userId,
            task_id: data.id,
            checked: false,
            checked_date: null,
          },
          { onConflict: "user_id,task_id" },
        );
        if (dailyError) setError(dailyError.message);
      }
    }

    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewTags("");
    setNewIsDaily(false);
    await refresh();
    await refreshDaily();
  }

  async function deleteTask(id: string) {
    setError(null);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    await refresh();
    await refreshDaily();
  }

  async function addActivities(taskId: string, messages: string[]) {
    if (messages.length === 0) return;
    const { error } = await supabase.from("task_activities").insert(
      messages.map((m) => ({
        task_id: taskId,
        actor_id: userId,
        message: m,
      })),
    );
    if (error) setError(error.message);
  }

  async function updateTaskAndLog(task: Task, patch: Partial<Task>) {
    setError(null);
    const { error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", task.id)
      .eq("user_id", userId);
    if (error) {
      setError(error.message);
      return;
    }

    const messages: string[] = [];

    if (patch.status && patch.status !== task.status) {
      messages.push(
        `Moved from ${statusTitle(task.status)} → ${statusTitle(
          patch.status as TaskStatus,
        )}`,
      );
    }

    if (typeof patch.title === "string" && patch.title !== task.title) {
      messages.push("Edited title");
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "description") &&
      patch.description !== task.description
    ) {
      messages.push("Edited description");
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "due_date") &&
      patch.due_date !== task.due_date
    ) {
      messages.push("Changed due date");
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "tags") &&
      JSON.stringify(patch.tags ?? []) !== JSON.stringify(task.tags ?? [])
    ) {
      messages.push("Updated tags");
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, "assigned_to") &&
      patch.assigned_to !== task.assigned_to
    ) {
      if (patch.assigned_to === userId) messages.push("Assigned to you");
      else if (patch.assigned_to === null) messages.push("Unassigned");
      else messages.push("Reassigned");
    }

    await addActivities(task.id, messages);
    await refresh();
  }

  function onDragStart(e: DragEvent, taskId: string) {
    e.dataTransfer.setData("text/task-id", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDropToStatus(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTaskAndLog(task, { status });
  }

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  const todayKey = localDateKey();

  const dailyTaskIdSet = useMemo(() => {
    return new Set(dailyRows.map((r) => r.task_id));
  }, [dailyRows]);

  const dailyTasks = useMemo(() => {
    return dailyRows
      .map((r) => {
        const task = tasksById.get(r.task_id);
        if (!task) return null;
        return { row: r, task };
      })
      .filter((v): v is { row: DailyTaskRow; task: Task } => Boolean(v));
  }, [dailyRows, tasksById]);
  const checkedToday = useMemo(() => {
    return new Set(
      dailyTasks
        .filter(({ row }) => row.checked && row.checked_date === todayKey)
        .map(({ task }) => task.id),
    );
  }, [dailyTasks, todayKey]);

  const nonDailyTasks = useMemo(() => {
    return tasks.filter((t) => !dailyTaskIdSet.has(t.id));
  }, [tasks, dailyTaskIdSet]);

  const awardDailyCompletionIfEligible = useCallback(async (reminderAtMs: number) => {
    const rows = dailyRowsRef.current;
    const isCompleteToday =
      rows.length > 0 && rows.every((r) => r.checked && r.checked_date === todayKey);
    if (!isCompleteToday) return;

    // Avoid double-awards from rapid rerenders.
    if (awardInFlightRef.current) return;
    awardInFlightRef.current = true;

    try {
      await supabase
        .from("user_stats")
        .upsert(
          { user_id: userId },
          { onConflict: "user_id" }
        );

      const { data: current, error } = await supabase
        .from("user_stats")
        .select("user_id,coins,streak,last_award_reminder_ms,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !current) {
        setCongratsText("Couldn’t update coins/streak. Please try again.");
        return;
      }

      const row = current as UserStatsRow;
      console.log(row)
      if (row.last_award_reminder_ms === reminderAtMs) {
        setCongratsText("Already counted for this reminder.");
        dispatchUserStatsUpdated(userId);
        return;
      }

      const coinsGain = rows.length * COINS_PER_DAILY_TASK;
      const nextStreak = (row.streak ?? 0) + STREAK_INCREMENT;
      const nextCoins = (row.coins ?? 0) + coinsGain;


      const { error: updateError } = await supabase
        .from("user_stats")
        .update({
          coins: nextCoins,
          streak: nextStreak,
          last_award_reminder_ms: reminderAtMs,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (updateError) {
        setCongratsText("Couldn’t update coins/streak. Please try again.");
        return;
      }

      console.log({
        rowCoins: row.coins,
        rowStreak: row.streak,
        coinsGain,
        nextCoins,
        nextStreak
      });

      setCongratsText(`+${coinsGain} coins · Streak ${nextStreak}`);
      dispatchUserStatsUpdated(userId);
    } finally {
      awardInFlightRef.current = false;
    }
  }, [supabase, todayKey, userId]);

  async function setDailyCompleted(row: DailyTaskRow, checked: boolean) {
    setError(null);
    const patch = checked
      ? { checked: true, checked_date: todayKey }
      : { checked: false, checked_date: null };
    const { error } = await supabase
      .from("daily_tasks")
      .update(patch)
      .eq("id", row.id)
      .eq("user_id", userId);
    if (error) {
      setError(error.message);
      return;
    }
    await refreshDaily();
  }

  function scheduleReminder() {
    setError(null);
    const hours = Number.parseInt(reminderHours, 10);
    const minutes = Number.parseInt(reminderMinutes, 10);
    const totalMinutes =
      (Number.isFinite(hours) ? Math.max(0, hours) : 0) * 60 +
      (Number.isFinite(minutes) ? Math.max(0, minutes) : 0);
    if (totalMinutes <= 0) {
      setError("Reminder time must be greater than 0 minutes.");
      return;
    }

    updateDailyMeta((m) => {
      if (dailyTasks.length === 0) return m;
      return {
        ...m,
        reminderAt: Date.now() + totalMinutes * 60 * 1000,
        reminderForDate: null,
      };
    });
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatCountdown(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!dailyMeta.reminderAt) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [dailyMeta.reminderAt]);

  useEffect(() => {
    if (!dailyMeta.reminderAt) return;
    const ms = Math.max(0, dailyMeta.reminderAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const meta = dailyMetaRef.current;
        const nowTodayKey = localDateKey();
        const reminderAtMs = meta.reminderAt;
        if (!reminderAtMs) return;

        const tasksNow = tasksRef.current;
        const byId = new Map(tasksNow.map((t) => [t.id, t] as const));
        const rows = dailyRowsRef.current;
        const missing = rows
          .filter((r) => !(r.checked && r.checked_date === nowTodayKey))
          .map((r) => byId.get(r.task_id)?.title ?? "Untitled");

        updateDailyMeta((m) => ({ ...m, reminderAt: null, reminderForDate: null }));

        if (missing.length === 0) {
          if (rows.length === 0) return;
          setCongratsText(null);
          setCongratsOpen(true);
          await awardDailyCompletionIfEligible(reminderAtMs);
          return;
        }

        setReminderMissingTitles(missing);
        setReminderOpen(true);
      })();
    }, ms);

    return () => window.clearTimeout(timeoutId);
  }, [
    awardDailyCompletionIfEligible,
    dailyMeta.reminderAt,
    dailyMeta.reminderForDate,
    todayKey,
    updateDailyMeta,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const c of KANBAN_COLUMNS) map.set(c.key, []);
    for (const t of nonDailyTasks) {
      const s = (t.status ?? "todo") as TaskStatus;
      map.get(s)?.push(t);
    }
    return map;
  }, [nonDailyTasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Drag cards between columns to update status.
          </p>
        </div>
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              New task
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                />
              </div>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="new-is-daily"
                checked={newIsDaily}
                onCheckedChange={(v) => {
                  const next = Boolean(v);
                  setNewIsDaily(next);
                }}
              />
              <Label htmlFor="new-is-daily">Daily task</Label>
            </div>
            <Input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma-separated)"
            />
            <div className="flex items-center justify-end">
              <Button onClick={createTask} disabled={!newTitle.trim() || creating}>
                {creating ? "Creating..." : "Add task"}
              </Button>
            </div>
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                Daily Tasks
                <Badge variant="secondary">
                  {checkedToday.size}/{dailyTasks.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-4 w-4" />
                {dailyMeta.reminderAt ? (
                  <span className="tabular-nums">
                    {formatCountdown(dailyMeta.reminderAt - nowTs)}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                className="h-8 w-20"
                value={reminderHours}
                onChange={(e) => setReminderHours(e.target.value)}
                aria-label="Reminder hours"
              />
              <span className="text-xs text-muted-foreground">h</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                className="h-8 w-20"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(e.target.value)}
                aria-label="Reminder minutes"
              />
              <span className="text-xs text-muted-foreground">m</span>
              <Button
                size="sm"
                variant="outline"
                onClick={scheduleReminder}
                disabled={dailyTasks.length === 0}
              >
                Remind
              </Button>
              {dailyMeta.reminderAt ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateDailyMeta((m) => ({
                      ...m,
                      reminderAt: null,
                      reminderForDate: null,
                    }))
                  }
                >
                  Clear
                </Button>
              ) : null}
            </div>

            {dailyMeta.reminderAt ? (
              <div className="text-xs text-muted-foreground">
                Reminder set for{" "}
                <span className="font-medium text-foreground">
                  {formatTime(dailyMeta.reminderAt)}
                </span>
                .
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {dailyTasks.map(({ row, task }) => (
                <div
                  key={row.id}
                  className={cn(
                    "group rounded-lg border bg-background p-3 shadow-sm transition-colors hover:bg-accent/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Checkbox
                        className="mt-1"
                        checked={row.checked && row.checked_date === todayKey}
                        onCheckedChange={(v) =>
                          void setDailyCompleted(row, Boolean(v))
                        }
                        aria-label={`Mark ${task.title} complete`}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{task.title}</div>
                        {task.description ? (
                          <div className="mt-1 max-h-10 overflow-hidden text-sm text-muted-foreground">
                            {task.description}
                          </div>
                        ) : null}
                        {task.initial_comment ? (
                          <div className="mt-1 max-h-10 overflow-hidden text-sm text-muted-foreground">
                            Comment: {task.initial_comment}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                          aria-label="Task actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingId(task.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(task.tags ?? []).slice(0, 4).map((t) => (
                      <Badge key={`${task.id}-tag-${t}`} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                    {(task.tags ?? []).length > 4 ? (
                      <Badge variant="outline">+{(task.tags ?? []).length - 4}</Badge>
                    ) : null}
                    {task.due_date ? (
                      <Badge variant="outline">Due {formatDate(task.due_date)}</Badge>
                    ) : null}
                  </div>
                </div>
              ))}

              {dailyTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Create a daily task using the checkbox in the New task box
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = grouped.get(col.key) ?? [];
          return (
            <div
              key={col.key}
              className="rounded-xl border bg-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropToStatus(e, col.key)}
            >
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{col.title}</div>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-3">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group rounded-lg border bg-background p-3 shadow-sm transition-colors hover:bg-accent/30",
                      "cursor-grab active:cursor-grabbing",
                    )}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{task.title}</div>
                        {task.description ? (
                          <div className="mt-1 max-h-10 overflow-hidden text-sm text-muted-foreground">
                            {task.description}
                          </div>
                        ) : null}
                        {task.initial_comment ? (
                          <div className="mt-1 max-h-10 overflow-hidden text-sm text-muted-foreground">
                            Comment: {task.initial_comment}
                          </div>
                        ) : null}
                      </div>

                      {COMMENT_BUTTON_STATUSES.has(col.key) &&
                        !dailyTaskIds.has(task.id) ? (
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 disabled:opacity-30"
                          aria-label="View comment"
                          draggable={false}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentViewId(task.id);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                            aria-label="Task actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingId(task.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteTask(task.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {(task.tags ?? []).slice(0, 4).map((t) => (
                        <Badge key={`${task.id}-tag-${t}`} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                      {(task.tags ?? []).length > 4 ? (
                        <Badge variant="outline">
                          +{(task.tags ?? []).length - 4}
                        </Badge>
                      ) : null}
                      {task.due_date ? (
                        <Badge variant="outline">Due {formatDate(task.due_date)}</Badge>
                      ) : null}
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Drop a task here
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {reminderOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setReminderOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div className="space-y-0.5">
                  <div className="text-sm text-muted-foreground">
                    Daily tasks reminder
                  </div>
                  <div className="font-semibold">You did not complete:</div>
                </div>
                <Button variant="ghost" onClick={() => setReminderOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="p-4">
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {reminderMissingTitles.map((t, idx) => (
                    <li key={`${t}-${idx}`}>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t p-4 text-xs text-muted-foreground">
                Check them off in{" "}
                <span className="font-medium text-foreground">Daily Tasks</span>{" "}
                to earn coins and keep your streak.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {congratsOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setCongratsOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div className="space-y-0.5">
                  <div className="text-sm text-muted-foreground">Daily tasks</div>
                  <div className="font-semibold">All done!</div>
                </div>
                <Button variant="ghost" onClick={() => setCongratsOpen(false)}>
                  Close
                </Button>
              </div>

              <div className="p-4 text-sm text-muted-foreground">
                {congratsText ? (
                  <div>
                    Congrats — <span className="font-medium text-foreground">{congratsText}</span>
                  </div>
                ) : (
                  <div>Congrats — updating your XP and streak…</div>
                )}
              </div>

              <div className="border-t p-4 text-xs text-muted-foreground">
                Your coins/streak update in the top-right.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {commentViewTask ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setCommentViewId(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <div className="space-y-0.5">
                  <div className="text-sm text-muted-foreground">Task comment</div>
                  <div className="truncate font-semibold">{commentViewTask.title}</div>
                </div>
                <Button variant="ghost" onClick={() => setCommentViewId(null)}>
                  Close
                </Button>
              </div>

              <div className="space-y-4 p-4">
                {commentViewTask.initial_comment ? (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Initial note</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">
                      {commentViewTask.initial_comment}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Comments</div>
                  {commentsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : commentRows.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No comments yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {commentRows.map((c) => (
                        <div key={c.id} className="rounded-lg border bg-background p-3">
                          <div className="whitespace-pre-wrap text-sm">{c.body}</div>
                          {c.created_at ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {new Date(c.created_at).toLocaleString()}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {commentsError ? (
                  <div className="text-sm text-destructive">{commentsError}</div>
                ) : null}

                {dailyTaskIds.has(commentViewTask.id) ? (
                  <div className="text-sm text-muted-foreground">
                    Comments are disabled for daily tasks.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder="Write a comment…"
                      className="min-h-24"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCommentDraft("")}
                        disabled={!commentDraft.trim()}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void addComment()}
                        disabled={!commentDraft.trim()}
                      >
                        Add comment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <TaskEditor
        open={Boolean(editingTask)}
        task={editingTask}
        userId={userId}
        isSaving={savingEdit}
        onClose={() => setEditingId(null)}
        onSave={async (patch) => {
          if (!editingTask) return;
          setSavingEdit(true);
          await updateTaskAndLog(editingTask, patch);
          setSavingEdit(false);
          setEditingId(null);
        }}
      />
    </div>
  );
}
