export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  tags: string[] | null;
  initial_comment: string | null;
  due_date: string | null;
  user_id?: string | null;
  assigned_to?: string | null;
  created_at: string | null;
};

export const KANBAN_COLUMNS: Array<{
  key: TaskStatus;
  title: string;
}> = [
    { key: "todo", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "in_review", title: "In Review" },
    { key: "done", title: "Done" },

  ];
