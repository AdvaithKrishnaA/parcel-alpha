import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ExtBundle } from './storage';
import { generateId } from '@app/crypto';

// Minimal inline styles for popup to keep it simple without setting up tailwind in extension again
const styles = {
  container: { width: '300px', padding: '16px', fontFamily: 'system-ui, sans-serif' },
  header: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' },
  btn: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btnSecondary: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  list: { listStyle: 'none', padding: 0, margin: '16px 0' },
  listItem: {
    padding: '8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  status: { fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' as const }
};

function Popup() {
  const [bundles, setBundles] = useState<ExtBundle[]>([]);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) setCurrentTab(tabs[0]);
    });

    // Get bundles
    chrome.runtime.sendMessage({ action: 'GET_BUNDLES' }, (response) => {
      if (response && !response.error) {
        setBundles(response);
      }
    });
  }, []);

  const handleCreateNew = () => {
    const id = generateId(12);
    handleAddTab(id);
  };

  const handleAddTab = (bundleId: string) => {
    if (!currentTab) return;
    setStatus('Adding to bundle...');
    chrome.runtime.sendMessage({
      action: 'ADD_TAB',
      bundleId,
      tab: { title: currentTab.title, url: currentTab.url }
    }, (response) => {
      if (response && response.success) {
        setStatus('Added successfully!');
        setTimeout(() => window.close(), 1500);
      } else {
        setStatus('Failed to add.');
      }
    });
  };

  const handleInstantShare = () => {
    if (!currentTab) return;
    setStatus('Creating encrypted link...');
    chrome.runtime.sendMessage({
      action: 'INSTANT_SHARE',
      tab: { title: currentTab.title, url: currentTab.url }
    }, (response) => {
      if (response && response.success) {
        navigator.clipboard.writeText(response.link);
        setStatus('Link copied to clipboard!');
        setTimeout(() => window.close(), 2000);
      } else {
        setStatus('Failed to share.');
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Parcel Extension</div>

      <button style={styles.btnSecondary} onClick={handleInstantShare}>
        Instant Share Current Page
      </button>

      <div style={{ marginTop: '16px', fontWeight: 'bold', fontSize: '14px' }}>
        Add to Bundle:
      </div>

      <ul style={styles.list}>
        {bundles.map(b => (
          <li key={b.id} style={styles.listItem} onClick={() => handleAddTab(b.id)}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.name || 'Untitled'}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {b.items.length} items
            </span>
          </li>
        ))}
      </ul>

      <button style={styles.btn} onClick={handleCreateNew}>
        + New Bundle with Current Page
      </button>

      {status && <div style={styles.status}>{status}</div>}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
