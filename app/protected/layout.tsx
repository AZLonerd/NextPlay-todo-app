import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MobileHeaderMenu } from "@/components/tasks/mobile-header-menu";
import { GlobalHistoryButton } from "@/components/tasks/global-history-button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen">
          <div className="border-b">
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
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
        </main>
      }
    >
      <ProtectedLayoutInner>{children}</ProtectedLayoutInner>
    </Suspense>
  );
}

async function ProtectedLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = (error ? null : (data?.claims?.sub as string | undefined)) ?? null;
  if (!userId) redirect("/auth/login");

  return (
    <main className="min-h-screen">
      <div className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
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
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <ThemeSwitcher />
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
