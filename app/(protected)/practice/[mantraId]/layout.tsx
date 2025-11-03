import { Metadata } from 'next';
import { constructMantraMetadata, getLearningResourceSchema } from '@/lib/metadata';
import { loadMantra } from '@/lib/mantraLoader';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mantraId: string }>;
}): Promise<Metadata> {
  try {
    const { mantraId } = await params;
    const mantra = await loadMantra(mantraId);
    return constructMantraMetadata({
      id: mantra.id,
      title: mantra.title,
      category: mantra.category,
    });
  } catch (error) {
    console.error('Error generating mantra metadata:', error);
    const { mantraId } = await params;
    return constructMantraMetadata({
      id: mantraId,
      title: 'Vedic Mantra Practice',
      category: 'Vedic Scriptures',
    });
  }
}

export default async function MantraPracticeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ mantraId: string }>;
}) {
  let mantraData = null;

  try {
    const { mantraId } = await params;
    mantraData = await loadMantra(mantraId);
  } catch (error) {
    console.error('Error loading mantra for structured data:', error);
  }

  return (
    <>
      {mantraData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getLearningResourceSchema({
              id: mantraData.id,
              title: mantraData.title,
              category: mantraData.category,
              audioUrl: mantraData.audioUrl,
            })),
          }}
        />
      )}
      {children}
    </>
  );
}
