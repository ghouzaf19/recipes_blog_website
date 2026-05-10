import { PortableText, PortableTextComponents, PortableTextBlock } from '@portabletext/react';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

// Named component wrapper for use in pages
export function CustomPortableText({ value }: { value: unknown[] }) {
  return <PortableText value={value as PortableTextBlock[]} components={customRenderer} />;
}

export const customRenderer: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <figure className="my-12 overflow-hidden rounded-2xl shadow-lg">
          <div className="relative w-full h-[400px] md:h-[500px]">
            <Image
              src={urlFor(value).url()}
              alt={value.alt || 'Blog asset for SEO context'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized
            />
          </div>
        </figure>
      );
    },
    externalImage: ({ value }) => {
      if (!value?.url) return null;
      return (
        <figure className="my-12 overflow-hidden rounded-2xl shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt={value.alt || 'Editorial food photography'}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105"
            style={{ minHeight: '300px', maxHeight: '600px', objectFit: 'cover' }}
          />
        </figure>
      );
    },
  },
  block: {
    h2: ({ children }) => {
      const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h2 id={id} className="text-3xl font-bold text-gray-900 mt-12 mb-6 scroll-mt-20 pb-2 border-b border-gray-200">{children}</h2>;
    },
    h3: ({ children }) => {
      const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h3 id={id} className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h3>;
    },
    h4: ({ children }) => {
      const id = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return <h4 id={id} className="text-xl font-bold text-gray-900 mt-8 mb-3">{children}</h4>;
    },
    blockquote: ({ children }) => (
      <blockquote className="blockquote pl-4 border-l-4 border-accent italic text-gray-700 my-6">
        {children}
      </blockquote>
    ),
    p: ({ children }) => (
      <p className="text-gray-800 mb-6 leading-relaxed">
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 pl-5 text-gray-800 mb-6">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 pl-5 text-gray-800 mb-6">
        {children}
      </ol>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const isExternal = !value.href.startsWith('/');
      return (
        <a 
          href={value.href} 
          rel={isExternal ? 'noreferrer noopener' : undefined} 
          target={isExternal ? '_blank' : undefined} 
          className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors duration-200"
        >
          {children}
        </a>
      );
    },
    strong: ({ children }) => (
      <strong className="font-bold">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    underline: ({ children }) => (
      <u className="underline">{children}</u>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
    ),
  },
};