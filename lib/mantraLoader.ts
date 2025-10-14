import { MantraData } from './types/mantra';

/**
 * Dynamically loads a mantra JSON file from the data/mantras directory
 * @param mantraId - The ID of the mantra to load (e.g., 'ganesha-gayatri')
 * @returns Promise<MantraData> - The mantra data
 */
export async function loadMantra(mantraId: string): Promise<MantraData> {
  try {
    // Dynamic import of the JSON file
    const mantraData = await import(`@/data/mantras/${mantraId}.json`);
    return mantraData.default || mantraData;
  } catch (error) {
    console.error(`Failed to load mantra: ${mantraId}`, error);
    throw new Error(`Mantra "${mantraId}" not found`);
  }
}

/**
 * Gets a list of all available mantras
 * @returns Array of mantra IDs
 */
export function getAvailableMantras(): string[] {
  // For now, return a static list. In the future, this could scan the directory
  return ['ganesha-gayatri', 'ganapathi-atharva-shirsham'];
}

/**
 * Gets metadata for all available mantras (title, category, id)
 * @returns Promise<Array<{id: string, title: string, category: string}>>
 */
export async function getAllMantrasMetadata(): Promise<
  Array<{ id: string; title: string; category: string }>
> {
  const mantraIds = getAvailableMantras();
  const metadata = await Promise.all(
    mantraIds.map(async (id) => {
      try {
        const mantra = await loadMantra(id);
        return {
          id: mantra.id,
          title: mantra.title,
          category: mantra.category,
        };
      } catch (error) {
        console.error(`Failed to load metadata for ${id}:`, error);
        return null;
      }
    })
  );

  // Filter out any failed loads
  return metadata.filter((m) => m !== null) as Array<{
    id: string;
    title: string;
    category: string;
  }>;
}
