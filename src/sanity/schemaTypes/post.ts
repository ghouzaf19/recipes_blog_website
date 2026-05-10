import { defineType, defineField } from 'sanity';

export const post = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    { name: 'content', title: '✍️ Content', default: true },
    { name: 'recipe', title: '🍳 Recipe Details' },
    { name: 'seo', title: '🔍 SEO & Metadata' },
  ],
  fields: [
    // ─── Core ────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().min(10).max(80),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      group: 'content',
      description: 'Auto-generated from title. Click "Generate" to create it.',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Short Description (Excerpt)',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'A short summary shown on the blog listing page.',
      validation: (Rule) => Rule.required().max(300),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'content',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'content',
    }),
    defineField({
      name: 'mainImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text (for accessibility & SEO)',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish Date',
      type: 'datetime',
      group: 'content',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'body',
      title: 'Article Body',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (Rule) =>
                      Rule.uri({ scheme: ['http', 'https', 'mailto'] }),
                  },
                  {
                    name: 'blank',
                    type: 'boolean',
                    title: 'Open in new tab',
                    initialValue: true,
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ],
        },
        {
          name: 'externalImage',
          type: 'object',
          title: 'External Image',
          fields: [
            defineField({
              name: 'url',
              type: 'url',
              title: 'Image URL',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            }),
          ],
        },
      ],
    }),

    // ─── Recipe Details ───────────────────────────────────
    defineField({
      name: 'cuisine',
      title: 'Cuisine Type',
      type: 'string',
      group: 'recipe',
      options: {
        list: [
          { title: 'Italian', value: 'Italian' },
          { title: 'French', value: 'French' },
          { title: 'American', value: 'American' },
          { title: 'Mexican', value: 'Mexican' },
          { title: 'Asian', value: 'Asian' },
          { title: 'Mediterranean', value: 'Mediterranean' },
          { title: 'Middle Eastern', value: 'Middle Eastern' },
          { title: 'Indian', value: 'Indian' },
          { title: 'Other', value: 'Other' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty Level',
      type: 'string',
      group: 'recipe',
      options: {
        list: [
          { title: '🟢 Easy', value: 'easy' },
          { title: '🟡 Medium', value: 'medium' },
          { title: '🔴 Hard', value: 'hard' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'prepTime',
      title: 'Prep Time (minutes)',
      type: 'number',
      group: 'recipe',
      validation: (Rule) => Rule.min(0).max(1440),
    }),
    defineField({
      name: 'cookTime',
      title: 'Cook Time (minutes)',
      type: 'number',
      group: 'recipe',
      validation: (Rule) => Rule.min(0).max(1440),
    }),
    defineField({
      name: 'servings',
      title: 'Servings',
      type: 'number',
      group: 'recipe',
      validation: (Rule) => Rule.min(1).max(100),
    }),
    defineField({
      name: 'ingredients',
      title: 'Ingredients',
      type: 'array',
      group: 'recipe',
      description: 'Add each ingredient on a separate line (e.g. "2 cups flour")',
      of: [{ type: 'string' }],
    }),

    // ─── SEO ─────────────────────────────────────────────
    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO Attributes',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
      date: 'publishedAt',
    },
    prepare({ title, author, media, date }) {
      const formattedDate = date
        ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No date';
      return {
        title,
        subtitle: `${author ? `by ${author}` : 'No author'} · ${formattedDate}`,
        media,
      };
    },
  },
  orderings: [
    {
      title: 'Publish Date, Newest',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Publish Date, Oldest',
      name: 'publishedAtAsc',
      by: [{ field: 'publishedAt', direction: 'asc' }],
    },
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
});