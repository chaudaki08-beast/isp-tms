import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppShell } from '@/components/AppShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell user={{ name: session.user.name, role: session.user.role }}>
      {children}
    </AppShell>
  );
}
