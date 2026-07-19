import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background bg-grid-pattern">
      {/* 
         USE flex-row. 
         This makes the layout perfectly responsive.
      */}
      <div className="flex flex-row w-full h-full">
        
        <Sidebar />
        
        {/* 
           Main Container: 
           Because the sidebar's DOM width drops to 0px on mobile,
           this 'flex-1' instantly expands to 100% width, centering the dashboard.
        */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden h-full">
          <Topbar />
          <main className="flex-1 overflow-hidden relative h-full">
            {children}
          </main>
        </div>
        
      </div>
    </div>
  );
}