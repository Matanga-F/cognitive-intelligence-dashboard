import AppLayout from '../../components/AppLayout';
import ConversationPanel from './components/ConversationPanel';

export default function ConversationPage() {
  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        <ConversationPanel />
      </div>
    </AppLayout>
  );
}