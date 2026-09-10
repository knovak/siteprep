import MemberPage from '@/components/member-page';
export default async function Page({
  params,
}: {
  params: Promise<{ fling: string; member: string }>;
}) {
  const { fling, member } = await params;
  return <MemberPage fling={fling} previewMember={member} />;
}
