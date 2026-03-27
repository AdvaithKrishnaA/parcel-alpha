import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit2, Share } from 'lucide-react';

export function Dashboard() {
  const { bundles, deleteBundle, passwordMode } = useAppContext();

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Bundles</h1>
        <Link to="/editor">
          <Button><Plus className="mr-2 h-4 w-4" /> New Bundle</Button>
        </Link>
      </div>

      {bundles.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have any bundles yet.</p>
            <Link to="/editor">
              <Button variant="outline">Create your first bundle</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map(bundle => (
            <Card key={bundle.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{bundle.name || 'Untitled Bundle'}</CardTitle>
                <CardDescription>{bundle.items.length} items</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Created on {new Date(bundle.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Link to={`/editor/${bundle.id}`}>
                  <Button variant="outline" size="icon"><Edit2 className="h-4 w-4" /></Button>
                </Link>
                <Button variant="destructive" size="icon" onClick={() => deleteBundle(bundle.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
