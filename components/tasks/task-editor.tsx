"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tasks";

function parseTags(input: string): string[] {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 12);
}

export function TaskEditor({
  open,
  task,
  userId,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  task: Task | null;
  userId: string;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description: string | null;
    due_date: string | null;
    tags: string[];
    assigned_to: string | null;
  }) => Promise<void>;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setDueDate(task.due_date ?? "");
    setAssignedTo(task.assigned_to ?? null);
    setTagsText((task.tags ?? []).join(", "));
  }, [open, task]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-4">
            <div className="space-y-0.5">
              <div className="text-sm text-muted-foreground">Edit task</div>
              <div className="font-semibold">{task.title}</div>
            </div>
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Close
            </Button>
          </div>

          <div className="space-y-6 p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Title</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Description</div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Due date</div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Tags</div>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="e.g. school, health, urgent"
                />
                <div className="text-xs text-muted-foreground">
                  Separate tags with commas.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Assignment</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    assignedTo === userId
                      ? "border-foreground/20 bg-accent"
                      : "hover:bg-accent/60",
                  )}
                  onClick={() => setAssignedTo(userId)}
                  aria-pressed={assignedTo === userId}
                >
                  Assigned to me
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    assignedTo === null
                      ? "border-foreground/20 bg-accent"
                      : "hover:bg-accent/60",
                  )}
                  onClick={() => setAssignedTo(null)}
                  aria-pressed={assignedTo === null}
                >
                  Unassigned
                </button>
              </div>
            </div>


            <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
              View full history anytime via the <span className="font-medium text-foreground">History</span>{" "}
              button in the top bar.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t p-4">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await onSave({
                  title: title.trim() || "Untitled",
                  description: description.trim() ? description.trim() : null,
                  due_date: dueDate || null,
                  tags: parseTags(tagsText),
                  assigned_to: assignedTo,
                });
              }}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
