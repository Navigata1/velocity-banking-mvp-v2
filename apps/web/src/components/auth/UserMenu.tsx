'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

function initialsFromUser(email: string | undefined, name: string | null | undefined): string {
  if (name && name.trim().length > 0) {
    return name
      .split(' ')
      .map((piece) => piece.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }
  return (email ?? 'U').charAt(0).toUpperCase();
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen);

  if (!session) {
    return (
      <Button variant="secondary" onClick={() => setAuthModalOpen(true)} className="w-full">
        Sign In
      </Button>
    );
  }

  const displayName = profile?.name || user?.user_metadata?.name || user?.email || 'Account';

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] px-3 py-2 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-text)]">
          {initialsFromUser(user?.email, profile?.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--color-text)]">{displayName as string}</span>
          <span className="block truncate text-xs text-[var(--color-text-secondary)]">{user?.email}</span>
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[110%] z-[140] w-64 rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-dropdown)] p-3 shadow-[0_12px_24px_var(--shadow-glass)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Account</p>
            <Badge tone="success">Cloud sync enabled</Badge>
          </div>
          <p className="text-sm text-[var(--color-text)]">{displayName as string}</p>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-300 hover:text-red-200"
            onClick={async () => {
              await signOut();
              setOpen(false);
            }}
          >
            Sign Out
          </Button>
        </div>
      ) : null}
    </div>
  );
}

