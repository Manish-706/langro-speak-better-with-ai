import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <Card>
        <p className="text-sm text-gray-500">
          Account settings will be added in a future phase.
        </p>
      </Card>
    </div>
  );
}
