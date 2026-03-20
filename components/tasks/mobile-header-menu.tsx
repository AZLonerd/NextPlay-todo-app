"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { GlobalHistoryButton } from "@/components/tasks/global-history-button";

export function MobileHeaderMenu({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <Button
        variant="outline"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] border-l bg-card shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-semibold">Menu</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Theme</div>
                <ThemeSwitcher />
              </div>

              <div className="flex flex-col gap-2">
                <div onClick={() => setOpen(false)}>
                  <GlobalHistoryButton userId={userId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
