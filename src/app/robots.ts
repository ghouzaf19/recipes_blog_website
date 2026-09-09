import { MetadataRoute } from 'next';
import { createRobotsMetadata } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return createRobotsMetadata();
}
