import { ApprovalGuard } from '@/components/ApprovalGuard';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApprovalGuard>{children}</ApprovalGuard>;
}
