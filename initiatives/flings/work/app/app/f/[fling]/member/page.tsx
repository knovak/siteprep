import MemberPage from '@/components/member-page';
export default async function Page({
  params,
}: {
  params: Promise<{ fling: string }>;
}) {
  const { fling } = await params;
  return <MemberPage fling={fling} />;
}
