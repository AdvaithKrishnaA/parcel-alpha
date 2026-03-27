import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Unlock, Loader2, CloudOff } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

export function PasswordUnlockModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { loadSync, isSyncing, passwordMode, setPasswordMode } = useAppContext();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError(null);
    const success = await loadSync(password);

    if (success) {
      setIsOpen(false);
      setPassword('');
    } else {
      setError('Failed to unlock sync. Please try again.');
    }
  };

  const handleDisableSync = () => {
    setPasswordMode(false);
    setIsOpen(false);
  }

  if (passwordMode) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
        <Lock className="h-4 w-4" />
        <span>End-to-End Encrypted Sync Active</span>
        <Button variant="ghost" size="sm" onClick={handleDisableSync} className="ml-2 h-auto py-1">
          <CloudOff className="h-3 w-3 mr-1" /> Disable
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Unlock className="h-4 w-4" /> Enable Encrypted Sync
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock End-to-End Sync</DialogTitle>
          <DialogDescription>
            Enter your master password to decrypt your sync blob. Your password never leaves your device and cannot be recovered if lost.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUnlock} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Master Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSyncing}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={!password || isSyncing}>
            {isSyncing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Decrypting Sync Blob...</>
            ) : (
              <><Lock className="mr-2 h-4 w-4" /> Unlock & Sync</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
