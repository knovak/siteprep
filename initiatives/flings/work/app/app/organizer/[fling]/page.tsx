import OrganizerPage from '@/components/organizer-page';
export default async function Page({
  params,
}: {
  params: Promise<{ fling: string }>;
}) {
  const { fling } = await params;
  return <OrganizerPage fling={fling} />;
}
