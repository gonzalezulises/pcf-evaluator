import { auth } from '@/lib/auth';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <SettingsForm
        initialName={session!.user.name}
        email={session!.user.email}
        role={session!.user.role}
      />
    </div>
  );
}
