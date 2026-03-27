import { storage } from './storage';
import type { ExtBundle } from './storage';
import { generateId, generateFolderKey, exportKey, encryptPayload } from '@app/crypto';

// The extension uses the worker API
const API_URL = 'http://127.0.0.1:8787';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_BUNDLES') {
    storage.getBundles().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // Keep channel open for async
  }

  if (request.action === 'ADD_TAB') {
    (async () => {
      try {
        const { bundleId, tab } = request;
        const bundles = await storage.getBundles();
        let targetBundle = bundles.find(b => b.id === bundleId);

        if (!targetBundle) {
          targetBundle = {
            id: bundleId,
            name: 'New Bundle',
            items: [],
            created_at: Date.now()
          };
        }

        const newItem = {
          id: generateId(8),
          url: tab.url || '',
          title: tab.title || null,
          note: null,
          mode: 'hidden' as const
        };

        targetBundle.items.push(newItem);
        await storage.saveBundle(targetBundle);

        sendResponse({ success: true, bundle: targetBundle });
      } catch (e: any) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }

  if (request.action === 'INSTANT_SHARE') {
    (async () => {
      try {
        const { tab } = request;

        // 1. Create a temporary bundle just for this link
        const bundle = {
          id: generateId(12),
          name: tab.title || 'Shared Link',
          items: [{
            id: generateId(8),
            url: tab.url || '',
            title: tab.title || null,
            note: null,
            mode: 'hidden' as const
          }],
          created_at: Date.now()
        };

        // 2. Encrypt
        const folderKey = generateFolderKey();
        const payloadStr = JSON.stringify(bundle);
        const encrypted = await encryptPayload(folderKey, payloadStr);

        // 3. Post to API
        const response = await fetch(`${API_URL}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: {
              iv: Array.from(encrypted.iv),
              ciphertext: Array.from(encrypted.ciphertext)
            },
            expires_in_ms: 24 * 60 * 60 * 1000, // 24h default for instant share
            max_views: null
          })
        });

        if (!response.ok) throw new Error('Failed to share');

        const { id } = await response.json();

        // 4. Return link
        // We will default to a placeholder APP_URL for self-hosting since background doesn't know origin directly
        // Better to get it from options, but for this spec we assume a standard APP_URL
        const appUrl = 'http://localhost:5173'; // Fallback
        const link = `${appUrl}/s/${id}#${exportKey(folderKey)}`;

        sendResponse({ success: true, link });
      } catch (e: any) {
        sendResponse({ error: e.message });
      }
    })();
    return true;
  }
});
