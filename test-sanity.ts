import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-03-01',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
});

async function test() {
  console.log('Testing Sanity token permissions...');
  console.log('Token starts with:', process.env.SANITY_API_CONTRIBUTOR?.slice(0, 10));
  
  try {
    const res = await client.create({
      _type: 'category',
      title: 'Test Category',
    });
    console.log('Success! Created category:', res._id);
    
    // Clean up
    await client.delete(res._id);
    console.log('Deleted test category.');
  } catch (err: any) {
    console.error('Error creating document:', err.message);
  }
}

test();
