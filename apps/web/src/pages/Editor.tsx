import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext, AppBundle } from '../contexts/AppContext';
import { generateId } from '@app/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Save, Share, Trash2 } from 'lucide-react';
import type { Item } from '@app/types';
import { ShareModal } from '../components/ShareModal';

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bundles, saveBundle } = useAppContext();

  const [bundle, setBundle] = useState<AppBundle>({
    id: generateId(12),
    name: '',
    items: [],
    created_at: Date.now()
  });

  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemHidden, setNewItemHidden] = useState(true);

  useEffect(() => {
    if (id) {
      const existing = bundles.find(b => b.id === id);
      if (existing) {
        setBundle(existing);
      }
    }
  }, [id, bundles]);

  const handleSave = () => {
    saveBundle(bundle);
    navigate('/');
  };

  const extractTitleFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return '';
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemUrl) return;

    let url = newItemUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const title = newItemTitle || extractTitleFromUrl(url) || url;

    const newItem: Item = {
      id: generateId(8),
      url,
      title,
      note: newItemNote || null,
      mode: newItemHidden ? 'hidden' : 'visible'
    };

    setBundle({
      ...bundle,
      items: [...bundle.items, newItem]
    });

    setNewItemUrl('');
    setNewItemTitle('');
    setNewItemNote('');
    setNewItemHidden(true);
  };

  const handleRemoveItem = (itemId: string) => {
    setBundle({
      ...bundle,
      items: bundle.items.filter(i => i.id !== itemId)
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{id ? 'Edit Bundle' : 'New Bundle'}</h1>
        </div>
        <div className="flex gap-2">
          {id && (
            <ShareModal bundle={bundle} />
          )}
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="bundle-name">Bundle Name</Label>
          <Input
            id="bundle-name"
            placeholder="My Awesome Links"
            value={bundle.name || ''}
              onChange={(e: any) => setBundle({ ...bundle, name: e.target.value })}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Links ({bundle.items.length})</h2>

          <div className="grid gap-4">
            {bundle.items.map((item, index) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex justify-between items-start gap-4">
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{item.url}</p>
                    {item.note && <p className="text-sm italic">{item.note}</p>}
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {item.mode === 'hidden' ? 'Hidden URL' : 'Visible URL'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-medium">Add New Link</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={newItemUrl}
                  onChange={(e: any) => setNewItemUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Example Site"
                  value={newItemTitle}
                  onChange={(e: any) => setNewItemTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Why are you saving this link?"
                value={newItemNote}
                onChange={(e: any) => setNewItemNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hidden-mode"
                  checked={newItemHidden}
                  onCheckedChange={setNewItemHidden}
                />
                <Label htmlFor="hidden-mode">Hide exact URL from viewers (Click-to-open)</Label>
              </div>

              <Button onClick={handleAddItem} disabled={!newItemUrl}>
                <Plus className="mr-2 h-4 w-4" /> Add Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
