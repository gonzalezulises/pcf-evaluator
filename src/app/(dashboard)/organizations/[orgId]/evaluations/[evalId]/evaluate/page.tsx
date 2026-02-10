import { auth } from '@/lib/auth';
import { EvaluateWorkspace } from './workspace';

export default async function EvaluateWorkspacePage() {
  const session = await auth();
  const userRole = session?.user?.role || 'viewer';

  return <EvaluateWorkspace userRole={userRole} />;
}
