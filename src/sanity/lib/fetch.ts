import 'server-only';
import { client } from './client';

export async function sanityFetch<QueryResponse>({
  query,
  params = {},
  tags,
}: {
  query: string;
  params?: Record<string, unknown>;
  tags: string[];
}): Promise<QueryResponse> {
  const token = process.env.SANITY_API_CONTRIBUTOR || process.env.SANITY_API_READ_TOKEN;
  const fetchClient = token ? client.withConfig({ token, useCdn: false }) : client;

  return fetchClient.fetch<QueryResponse>(query, params, {
    next: {
      tags,
      revalidate: 0, // Bypass cache to ensure immediate updates
    },
  });
}