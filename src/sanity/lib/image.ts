import imageUrlBuilder from '@sanity/image-url';
// Builder is imported above as default
import { client } from './client';

/**
 * Sanity Image URL builder helper
 * @param source - The Sanity image source
 * @returns Image URL builder instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const urlFor = (source: any) => {
  return imageUrlBuilder(client).image(source);
};