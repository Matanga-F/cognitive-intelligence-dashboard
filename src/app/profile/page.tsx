'use client';

import React from 'react';
import { Wrench } from 'lucide-react';

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <Wrench size={48} className="text-muted-foreground animate-pulse" />
      <div>
        <h2 className="text-lg font-semibold text-foreground font-mono">Profile</h2>
        <p className="text-sm text-muted-foreground font-mono mt-1">This page is under construction</p>
        <p className="text-xs text-muted-foreground/60 font-mono mt-2">
          CIOS Profile will be available in the next release
        </p>
      </div>
    </div>
  );
}
