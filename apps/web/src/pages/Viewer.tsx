import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { importKey, decryptPayload, deriveMasterKey, CryptoOutput } from '@app/crypto';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ExternalLink, Loader2, Lock } from 'lucide-react';
import type { Item, EncryptedPayload } from '@app/types';

export function Viewer() {
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<EncryptedPayload | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [serverData, setServerData] = useState<any>(null);
  const [fragmentKey, setFragmentKey] = useState<string>('');

  useEffect(() => {
    const fetchAndDecrypt = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get fragment (key)
        const fragment = location.hash.substring(1);
        if (!fragment) throw new Error("Missing decryption key in URL fragment");

        setFragmentKey(fragment);

        // 2. Clear fragment from URL so it doesn't leak or stay in history
        window.history.replaceState(null, '', location.pathname + location.search);

        // 3. Fetch encrypted payload from server
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787';
        const response = await fetch(`${apiUrl}/${id}`);

        if (!response.ok) {
          if (response.status === 404) throw new Error("Bundle not found");
          if (response.status === 410) throw new Error("Bundle has expired or reached view limit");
          throw new Error("Failed to load bundle");
        }

        const data = await response.json();
        setServerData(data);

        // Check if password mode
        if (fragment.startsWith('p_')) {
          setRequiresPassword(true);
          setLoading(false);
          return; // Wait for user to input password
        }

        const folderKey = importKey(fragment);

        const cryptoOutput: CryptoOutput = {
          iv: new Uint8Array(data.iv),
          ciphertext: new Uint8Array(data.ciphertext)
        };

        // 4. Decrypt payload
        const decryptedStr = await decryptPayload(folderKey, cryptoOutput);
        const parsedPayload = JSON.parse(decryptedStr) as EncryptedPayload;

        setPayload(parsedPayload);
      } catch (e: any) {
        console.error("Decrypt error", e);
        setError(e.message || "Failed to decrypt bundle");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAndDecrypt();
    }
  }, [id, location]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !serverData || !fragmentKey) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Derive key from password
      const passKey = await deriveMasterKey(password);

      // 2. Parse the p_IV_CIPHERTEXT
      const parts = fragmentKey.split('_');
      if (parts.length !== 3) throw new Error("Invalid password-protected link");

      const ivStr = atob(parts[1]);
      const iv = new Uint8Array(ivStr.length);
      for(let i=0; i<ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

      const ctStr = atob(parts[2]);
      const ciphertext = new Uint8Array(ctStr.length);
      for(let i=0; i<ctStr.length; i++) ciphertext[i] = ctStr.charCodeAt(i);

      // 3. Decrypt the folder key
      const decryptedKeyStr = await decryptPayload(passKey, { iv, ciphertext });
      const folderKey = importKey(decryptedKeyStr);

      // 4. Decrypt the actual payload
      const cryptoOutput: CryptoOutput = {
        iv: new Uint8Array(serverData.iv),
        ciphertext: new Uint8Array(serverData.ciphertext)
      };

      const decryptedStr = await decryptPayload(folderKey, cryptoOutput);
      const parsedPayload = JSON.parse(decryptedStr) as EncryptedPayload;

      setPayload(parsedPayload);
      setRequiresPassword(false);

    } catch(e) {
      console.error(e);
      setError("Incorrect password or corrupted link");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading && !requiresPassword) {
    return (
      <div className="container mx-auto py-24 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Decrypting bundle...</p>
      </div>
    );
  }

  if (requiresPassword && !payload) {
    return (
      <div className="container mx-auto py-24 flex flex-col items-center justify-center max-w-md">
        <div className="bg-card border rounded-lg p-8 w-full shadow-sm text-center">
          <Lock className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Password Protected</h2>
          <p className="text-muted-foreground mb-6">This bundle is encrypted with a password.</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={!password || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-24 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button className="mt-8" onClick={() => window.location.href = '/'}>
          Go Home
        </Button>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="container mx-auto py-12 max-w-3xl">
      <div className="mb-12 text-center space-y-2">
        <h1 className="text-4xl font-bold">{payload.name || "Shared Bundle"}</h1>
        <p className="text-muted-foreground">
          {payload.items.length} links • Created on {new Date(payload.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-6">
        {payload.items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex justify-between items-start gap-4">
                <span>{item.title || item.url}</span>
                <Button variant="secondary" size="sm" onClick={() => handleOpenLink(item.url)}>
                  Open <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.note && <p className="mb-4 italic text-muted-foreground">{item.note}</p>}

              {item.mode === 'visible' && (
                <div className="bg-muted p-2 rounded-md mt-2 text-sm font-mono truncate">
                  {item.url}
                </div>
              )}
              {item.mode === 'hidden' && (
                <div className="bg-muted p-2 rounded-md mt-2 text-sm text-muted-foreground italic flex items-center justify-center">
                  URL is hidden by creator
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>This bundle is end-to-end encrypted. The server cannot read its contents.</p>
      </div>
    </div>
  );
}
