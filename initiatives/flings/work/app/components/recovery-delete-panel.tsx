'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export default function RecoveryDeletePanel({
  fling,
  title,
  revision,
  request,
}: {
  fling: string;
  title: string;
  revision: number;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [typed, setTyped] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="profile-panel" aria-label="Delete gathering">
      <h3>Delete gathering</h3>
      <p>
        Closing keeps the gathering and its history. Deletion removes this
        gathering from active application storage.
      </p>
      <Button
        variant="destructive"
        onClick={() => {
          setOpen(true);
          setTyped('');
          setConfirmed(false);
          setError('');
        }}
      >
        Delete this gathering…
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete {title} permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes member contacts, invitations, discussions, polls,
            payments, message history and access links for this gathering.
            Downloaded backups, external messages and provider backups have
            separate retention and are not erased here. Save a backup first if
            you need one.
          </AlertDialogDescription>
          <label htmlFor="delete-gathering-title">
            Type the gathering title to delete
            <Input
              id="delete-gathering-title"
              value={typed}
              disabled={busy}
              onChange={(e) => setTyped(e.target.value)}
            />
          </label>
          <label
            htmlFor="delete-gathering-confirm"
            className="flex gap-2 items-start"
          >
            <Checkbox
              id="delete-gathering-confirm"
              disabled={busy}
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
            />
            I understand this permanently removes the gathering from this app.
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <AlertDialogCancel disabled={busy}>Keep gathering</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy || !confirmed || typed !== title}
            onClick={() => {
              setBusy(true);
              setError('');
              void request(fling + '/organizer/recovery/delete', 'POST', {
                title: typed,
                revision,
                confirm_delete: true,
              })
                .then(() => {
                  window.location.assign('/organizer');
                })
                .catch((e: Error) => {
                  setError(e.message);
                  setBusy(false);
                  setConfirmed(false);
                });
            }}
          >
            {busy ? 'Deleting…' : 'Permanently delete gathering'}
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
