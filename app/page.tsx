import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HomeCreateAccountButton } from "@/components/home-create-account-button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">
              NextPlay Tasks
            </Link>
            <Button asChild size="sm" variant="secondary">
              <Link href="/protected">Board</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              Kanban • Drag & drop • Supabase Auth
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              A simple, modern Kanban todo app.
            </h1>
            <p className="text-base text-muted-foreground">
              Log in, create tasks, and move them across a clean board. No
              complexity—just CRUD.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/protected">Open board</Link>
              </Button>
              <Suspense fallback={null}>
                <HomeCreateAccountButton />
              </Suspense>
            </div>
            <p className="text-sm text-muted-foreground">
              The board is protected. You’ll be prompted to sign in first.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-dashed">
                <CardHeader className="pb-2 text-sm font-medium">To Do</CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Draft tasks
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-2 text-sm font-medium">
                  In Progress
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Actively working
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-2 text-sm font-medium">
                  In Review
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Quick check
                </CardContent>
              </Card>
              <Card className="border-dashed">
                <CardHeader className="pb-2 text-sm font-medium">Done</CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Shipped
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
