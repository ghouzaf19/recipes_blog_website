import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId, useCdn } from '../env';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  stega: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.DRAFT_MODE === 'true',
    studioUrl: '/studio',
  },
});