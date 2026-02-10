import { auth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>
      <Card>
        <CardHeader>
          <CardTitle>Perfil de usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nombre</p>
            <p className="font-medium">{session!.user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{session!.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rol</p>
            <Badge variant="secondary">{session!.user.role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
