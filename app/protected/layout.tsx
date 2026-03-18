import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GlobalHistoryButton } from "@/components/tasks/global-history-button";
import { DailyXpIndicator } from "@/components/tasks/daily-xp-indicator";
import { CoinsLeaderboardButton } from "@/components/tasks/streak-leaderboard-button";
import { Button } from "@/components/ui/button";
import { MobileHeaderMenu } from "@/components/tasks/mobile-header-menu";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = (error ? null : (data?.claims?.sub as string | undefined)) ?? null;
  if (!userId) redirect("/auth/login");

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-semibold tracking-tight">
                NextPlay Tasks
              </Link>
              <Button asChild size="sm" variant="secondary">
                <Link href="/protected">Board</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <ThemeSwitcher />
              <DailyXpIndicator userId={userId} />
              <CoinsLeaderboardButton userId={userId} />
              <GlobalHistoryButton userId={userId} />
            </div>
            {hasEnvVars ? (
              <Suspense>
                <AuthButton />
              </Suspense>
            ) : null}
            <MobileHeaderMenu userId={userId} />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
    </main>
  );
}
