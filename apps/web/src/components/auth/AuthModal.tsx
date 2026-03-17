'use client';

import { FormEvent, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';

type Mode = 'signin' | 'signup';

export default function AuthModal() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const authModalOpen = useAuthStore((state) => state.authModalOpen);
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const authError = useAuthStore((state) => state.error);
  const status = useAuthStore((state) => state.status);

  const title = useMemo(() => (mode === 'signin' ? 'Sign In' : 'Create Account'), [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (mode === 'signin') {
      const result = await signIn(email, password);
      if (!result.ok) {
        setMessage(result.error ?? 'Sign-in failed.');
      }
      return;
    }

    const result = await signUp(email, password, name || undefined);
    if (!result.ok) {
      setMessage(result.error ?? 'Sign-up failed.');
      return;
    }

    setMessage('Account created. Check your inbox if email confirmation is enabled.');
  };

  return (
    <Modal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      title={title}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
          <Button type="submit" form="auth-form" loading={status === 'loading'}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </div>
      }
    >
      <form id="auth-form" className="space-y-3" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <label className="space-y-1.5">
            <span className="text-xs text-[var(--color-text-secondary)]">Name (optional)</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" />
          </label>
        ) : null}

        <label className="space-y-1.5">
          <span className="text-xs text-[var(--color-text-secondary)]">Email</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs text-[var(--color-text-secondary)]">Password</span>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={async () => {
            const result = await signInWithGoogle();
            if (!result.ok) {
              setMessage(result.error ?? 'Google sign-in unavailable.');
            }
          }}
        >
          Continue with Google
        </Button>

        {(message || authError) ? (
          <p className="text-xs text-amber-300">{message ?? authError}</p>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">Session and profile sync are optional for demo mode.</p>
        )}
      </form>
    </Modal>
  );
}

