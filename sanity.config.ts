import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';

export default defineConfig({
  name: 'default',
  title: 'CookeTricks — Admin Studio',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',

  basePath: '/studio',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // ── Blog Posts ──────────────────────────────────
            S.listItem()
              .title('📝 Blog Posts')
              .child(
                S.documentList()
                  .title('All Blog Posts')
                  .filter('_type == "post"')
                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
              ),

            S.divider(),

            // ── Supporting content ──────────────────────────
            S.listItem()
              .title('👤 Authors')
              .child(S.documentList().title('Authors').filter('_type == "author"')),

            S.listItem()
              .title('📂 Categories')
              .child(S.documentList().title('Categories').filter('_type == "category"')),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
});
