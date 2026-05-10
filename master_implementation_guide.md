# Single Source of Truth: Extreme SEO Blog Engine

## Core Architecture
- **Frontend Framework**: Next.js (App Router, TypeScript)
- **CMS Environment**: Sanity.io (Headless API)
- **Hosting Infrastructure**: Hostinger Business (Node.js stand-alone environment)
- **CSS Framework**: Tailwind CSS
- **Primary Goal**: 100/100 Core Web Vitals, maximum SEO indexing capability, Zero-code runtime scaling.

---

## Phase 1: Environment Setup
1. **Initialize Next.js:**
    ```bash
    npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir
    ```
2. **Install CMS Dependencies:**
    ```bash
    npm install next-sanity @portabletext/react @sanity/image-url
    ```
3. **Initialize Sanity Studio (within a `/sanity` folder or standalone):**
    ```bash
    npm create sanity@latest
    ```
    *Select the "Blog (Schema with posts and authors)" preset as your foundation.*

---

## Phase 2: Schema Architecture (Sanity)
Create an SEO object type (`seo.ts`) to be embedded in your Document types.

**`src/sanity/schemaTypes/seo.ts`**
```typescript
import { defineType, defineField } from 'sanity';

export const seo = defineType({
  name: 'seo',
  title: 'SEO & Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      validation: (Rule) => Rule.max(60).warning('Keep under 60 chars for Google.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      validation: (Rule) => Rule.max(160).warning('Keep under 160 chars.'),
    }),
    defineField({
      name: 'shareImage',
      title: 'Share Image (OpenGraph)',
      type: 'image',
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
    }),
  ],
});
```
*Inject this into the `post.ts` schema: `defineField({ name: 'seo', type: 'seo', title: 'SEO' })`*

---

## Phase 3: The Connection Bridge (Next.js Edge)

### 1. Client Setup (`src/sanity/lib/client.ts`)
```typescript
import { createClient } from 'next-sanity';

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-03-01',
  useCdn: false, // Must be false for ISR implementation
  stega: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || process.env.DRAFT_MODE === 'true',
    studioUrl: '/studio',
  },
});
```

### 2. Fetch Utility with Cache Tags (`src/sanity/lib/fetch.ts`)
```typescript
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
  return client.fetch<QueryResponse>(query, params, {
    next: {
      tags,
      revalidate: 3600, // Background fallback cache validation (ISR)
    },
  });
}
```

---

## Phase 4: SEO Component Translators

### Portable Text Renderer (`src/components/CustomPortableText.tsx`)
```tsx
import { PortableTextComponents } from '@portabletext/react';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image'; 

export const customRenderer: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <div className="relative w-full h-[400px] my-8 overflow-hidden rounded-lg">
          <Image
            src={urlFor(value).url()}
            alt={value.alt || 'Blog asset for SEO context'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            placeholder="blur" 
            blurDataURL={urlFor(value).width(20).quality(20).url()}
          />
        </div>
      );
    },
  },
  block: {
    h2: ({ children }) => {
      const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h2 id={id} className="text-3xl font-bold mt-12 mb-4 scroll-mt-20">{children}</h2>;
    },
  },
  marks: {
    link: ({ children, value }) => {
      const isExternal = !value.href.startsWith('/');
      return (
        <a 
          href={value.href} 
          rel={isExternal ? 'noreferrer noopener' : undefined} 
          target={isExternal ? '_blank' : undefined} 
          className="text-blue-600 hover:underline"
        >
          {children}
        </a>
      );
    },
  },
};
```

---

## Phase 5: The Invalidation Engine

### Webhook Route (`src/app/api/revalidate/route.ts`)
```typescript
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { parseBody } from 'next-sanity/webhook';

const secret = process.env.SANITY_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{ _type: string, slug?: { current: string } }>(req, secret);

    if (!isValidSignature) return new Response('Invalid Signature', { status: 401 });
    if (!body?._type) return new Response('Bad Request', { status: 400 });

    if (body.slug?.current) {
        revalidateTag(`${body._type}:${body.slug.current}`);
    }
    revalidateTag('blog-index');

    return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
```

---

## Phase 6: Hostinger Infrastructure Config

### 1. `next.config.js` 
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Essential for Hostinger Node.js mapping
  images: {
    remotePatterns: [ { protocol: 'https', hostname: 'cdn.sanity.io' } ],
  },
};
module.exports = nextConfig;
```

### 2. Standalone Deployment Workflow
1. Run `npm run build`
2. Next.js creates the `.next/standalone` folder.
3. **CRITICAL:** Run deployment scripts to merge static assets inside the standalone folder:
   - Copy `./public` folders entirely inside `.next/standalone/public`
   - Copy `.next/static` folder entirely inside `.next/standalone/.next/static`
4. Compress, transfer to Hostinger limits, and unpack into Node.js App container.
5. Provide Hostinger interface the Entry Point of `server.js`.
6. Bind environment vars (`NEXT_PUBLIC_SANITY_PROJECT_ID`, etc.) securely via Hostinger panel.

---

## Summary Guidelines for AI Agents
- **Strict Adherence:** AI agents must follow this architectural design exactly as written.
- **Enforce Semantic HTML:** Always utilize semantic tags mapped through the Custom Portable Text component.
- **Cache Invalidation:** Any headless fetching mechanism *must* utilize the `sanityFetch` engine wrapped around the Next.js Cache tag paradigm, avoiding raw manual `fetch` calls.
- **No Div-Soup:** AI agents must refuse the utilization of third-party client wrapper components for text formatting without rendering via robust JSON AST processing.