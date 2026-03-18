import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export async function HomeCreateAccountButton() {
  if (!hasEnvVars) {
    return (
      <Button asChild variant="outline">
        <Link href="/auth/sign-up">Create account</Link>
      </Button>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isLoggedIn = !error && Boolean(data?.claims?.sub);

  if (isLoggedIn) return null;

  return (
    <Button asChild variant="outline">
      <Link href="/auth/sign-up">Create account</Link>
    </Button>
  );
}

