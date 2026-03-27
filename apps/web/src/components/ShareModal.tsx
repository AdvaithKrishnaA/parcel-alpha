import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Share, Loader2 } from 'lucide-react';
import { generateFolderKey, exportKey, encryptPayload, deriveMasterKey } from '@app/crypto';
import type { AppBundle } from '../contexts/AppContext';

interface ShareModalProps {
  bundle: AppBundle;
}

export function ShareModal({ bundle }: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Settings
  const [expiresIn, setExpiresIn] = useState<number | null>(7 * 24 * 60 * 60 * 1000); // 7 days default
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const [password, setPassword] = useState<string>('');
  const [usePassword, setUsePassword] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);

      // 1. Generate folder key
      const folderKey = generateFolderKey();

      // 2. Prepare payload
      const payloadObj = {
        version: 1,
        name: bundle.name,
        items: bundle.items,
        created_at: bundle.created_at
      };

      const payloadStr = JSON.stringify(payloadObj);

      // 3. Encrypt payload
      const encrypted = await encryptPayload(folderKey, payloadStr);

      // 4. Send to server
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787';
      const response = await fetch(`${apiUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            iv: Array.from(encrypted.iv),
            ciphertext: Array.from(encrypted.ciphertext)
          },
          expires_in_ms: expiresIn, // null = no expiry
          max_views: maxViews
        })
      });

      if (!response.ok) throw new Error('Failed to create share');

      const { id } = await response.json();

      // 5. Construct link with fragment
      let fragmentPayload = exportKey(folderKey);

      // Password mode: encrypt the folder_key itself
      if (usePassword && password) {
        const passKey = await deriveMasterKey(password);
        // Encrypt the exported folder_key string with the password key
        const encryptedKey = await encryptPayload(passKey, fragmentPayload);
        // We pack the IV and ciphertext into the fragment
        // Format: p_IV_CIPHERTEXT (p_ denotes password mode)
        const ivBase64 = btoa(String.fromCharCode(...encryptedKey.iv));
        const ctBase64 = btoa(String.fromCharCode(...encryptedKey.ciphertext));
        fragmentPayload = `p_${ivBase64}_${ctBase64}`;
      }

      const appUrl = window.location.origin;
      const link = `${appUrl}/s/${id}#${fragmentPayload}`;

      setShareLink(link);
    } catch (e) {
      console.error(e);
      alert("Failed to share bundle");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      alert("Copied to clipboard!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share className="mr-2 h-4 w-4" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Bundle</DialogTitle>
          <DialogDescription>
            Create an end-to-end encrypted link to share your bundle. The server never sees your data.
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="expiry">Expires in</Label>
                <select
                  id="expiry"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ml-4 max-w-[200px]"
                  value={expiresIn ?? ''}
                  onChange={(e) => setExpiresIn(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">Never</option>
                  <option value={60 * 60 * 1000}>1 Hour</option>
                  <option value={24 * 60 * 60 * 1000}>1 Day</option>
                  <option value={7 * 24 * 60 * 60 * 1000}>7 Days</option>
                  <option value={30 * 24 * 60 * 60 * 1000}>30 Days</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="views">Max Views</Label>
                <select
                  id="views"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ml-4 max-w-[200px]"
                  value={maxViews || ''}
                  onChange={(e) => setMaxViews(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Unlimited</option>
                  <option value={1}>1 (Burn after reading)</option>
                  <option value={5}>5 Views</option>
                  <option value={10}>10 Views</option>
                </select>
              </div>

              <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Switch id="password-mode" checked={usePassword} onCheckedChange={setUsePassword} />
                  <Label htmlFor="password-mode">Password Protect</Label>
                </div>
                {usePassword && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="share-password">Password</Label>
                    <Input
                      id="share-password"
                      type="password"
                      placeholder="Enter a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button className="w-full" onClick={handleShare} disabled={loading || bundle.items.length === 0 || (usePassword && !password)}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share className="mr-2 h-4 w-4" />}
              {bundle.items.length === 0 ? 'Add items to share' : 'Generate Secure Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium mb-2">Share Link</p>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly />
                <Button variant="secondary" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Anyone with this link can decrypt and view your bundle.
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setShareLink(null)}>
              Create Another Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
