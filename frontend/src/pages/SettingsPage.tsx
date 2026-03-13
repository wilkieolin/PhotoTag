import ScanDialog from '../components/scan/ScanDialog';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Scan Photos</h2>
        <ScanDialog />
      </div>
    </div>
  );
}
