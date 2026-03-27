import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { PasswordUnlockModal } from '../components/PasswordUnlockModal';
import { Package } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

export function Layout() {
  const location = useLocation();
  const isViewer = location.pathname.startsWith('/s/');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Package className="h-6 w-6" /> Parcel
          </Link>

          {!isViewer && (
            <div className="flex items-center gap-4">
              <PasswordUnlockModal />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 bg-muted/20">
        <Outlet />
      </main>

      <footer className="border-t py-6 bg-background text-center text-sm text-muted-foreground">
        <p>Parcel — Self-Hostable Encrypted Bundle Sharing</p>
      </footer>
    </div>
  );
}
