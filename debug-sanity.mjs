import { createClient } from "next-sanity";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-03-01",
  token: process.env.SANITY_API_CONTRIBUTOR,
  useCdn: false,
});

async function debug() {
  console.log("Project ID:", process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
  console.log("Dataset:", process.env.NEXT_PUBLIC_SANITY_DATASET);

  // Check ALL documents including drafts
  const all = await client.fetch('*[_type == "post"] { _id, title, slug, publishedAt }');
  console.log("\nALL post documents in Sanity (including drafts):");
  console.log(JSON.stringify(all, null, 2));

  // Check exactly what the homepage query would return
  const published = await client.fetch(
    '*[_type == "post" && defined(slug.current)] | order(publishedAt desc) [0..11] { _id, title, slug, publishedAt }'
  );
  console.log("\nDocuments returned by homepage GROQ query:");
  console.log(JSON.stringify(published, null, 2));
}

debug().catch(console.error);
