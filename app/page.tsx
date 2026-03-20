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
    <main className="min-h-screen">
      <div className="border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold tracking-tight">
              NextPlay Tasks
            </Link>
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="rounded-full border border-input shadow-sm"
            >
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
            <div className="inline-flex items-center rounded-full border bg-gradient-to-r from-primary/10 via-card to-chart-2/10 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              Kanban • Drag & drop
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              A simple, modern{" "}
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Kanban
              </span>{" "}
              todo app.
            </h1>
            <p className="text-base text-muted-foreground">
              Log in, create tasks, and move them across a clean board!
              Gain motivation with game features!
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

          <div className="rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
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
