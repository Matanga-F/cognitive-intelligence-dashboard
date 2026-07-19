import AppLayout from '../components/AppLayout';
import EventFeedPanel from './components/EventFeedPanel';

export default function EventFeedPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        <EventFeedPanel />
      </div>
    </AppLayout>
  );
}