import { redirect } from 'next/navigation';

export default async function ThumbnailGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/create/image`);
}
