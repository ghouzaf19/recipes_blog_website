import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-03-01',
  token: process.env.SANITY_API_CONTRIBUTOR,
  useCdn: false,
});

async function main() {
  console.log('Seeding data...');
  
  // First, create an author
  const authorRes = await client.create({
    _type: 'author',
    name: 'Google AI',
    slug: { current: 'google-ai', _type: 'slug' },
    bio: [
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: 'An artificial intelligence developed by Google.' }]
      }
    ]
  });

  console.log('Created author:', authorRes._id);

  // Categories
  const catRes1 = await client.create({
    _type: 'category',
    title: 'Technology',
    description: 'Tech news and updates'
  });
  const catRes2 = await client.create({
    _type: 'category',
    title: 'Innovation',
    description: 'Innovations around the world'
  });

  // Now create posts
  const posts = [
    {
      _type: 'post',
      title: 'The Future of AI in Web Development',
      slug: { current: 'future-of-ai-web-development', _type: 'slug' },
      author: { _type: 'reference', _ref: authorRes._id },
      categories: [
        { _type: 'reference', _ref: catRes1._id, _key: '1' }
      ],
      publishedAt: new Date().toISOString(),
      excerpt: 'How AI is revolutionizing the way we build websites and web applications.',
      body: [
        {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'Artificial Intelligence is fundamentally changing web development. From intelligent code completion to automated testing, the tools available to developers are becoming smarter and more powerful every day.' }]
        }
      ],
      prepTime: 5,
      cookTime: 10,
      difficulty: 'easy',
      servings: 1,
      cuisine: 'Digital',
    },
    {
      _type: 'post',
      title: 'Mastering Next.js 14 and Sanity CMS',
      slug: { current: 'mastering-nextjs-sanity-cms', _type: 'slug' },
      author: { _type: 'reference', _ref: authorRes._id },
      categories: [
        { _type: 'reference', _ref: catRes1._id, _key: '2' },
        { _type: 'reference', _ref: catRes2._id, _key: '3' }
      ],
      publishedAt: new Date().toISOString(),
      excerpt: 'A comprehensive guide to building modern, SEO-friendly web applications using Next.js App Router and Sanity Headless CMS.',
      body: [
        {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'Next.js 14 combined with Sanity CMS offers an unparalleled developer experience and blazing fast performance for users. By leveraging features like React Server Components and Incremental Static Regeneration, we can build dynamic websites that feel instantly responsive.' }]
        }
      ],
      prepTime: 15,
      cookTime: 45,
      difficulty: 'medium',
      servings: 100,
      cuisine: 'Frontend',
    }
  ];

  for (const post of posts) {
    const res = await client.create(post);
    console.log('Created post:', res._id);
  }

  console.log('Seeding complete!');
}

main().catch(console.error);
