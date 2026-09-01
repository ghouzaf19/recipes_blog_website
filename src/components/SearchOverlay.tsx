"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchPost {
  id: number | string;
  title: string;
  slug: string;
  excerpt?: string;
  image?: {
    url: string;
    alt: string;
  } | null;
  contentType?: string;
}

export default function SearchOverlay({
  isOpen,
  onClose,
}: SearchOverlayProps) {
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(false);

  // Lock the page behind the search overlay
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Load latest articles when search opens
  useEffect(() => {
    if (!isOpen || posts.length > 0) return;

    async function loadPosts() {
      try {
        setLoading(true);

        const response = await fetch("/api/search-suggestions");

        if (!response.ok) {
          throw new Error("Failed to load articles");
        }

        const data = await response.json();

        setPosts(data);
      } catch (error) {
        console.error("Search overlay fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [isOpen, posts.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
 {/* Background page blur */}
  <div
    className="absolute inset-0 bg-black/35 backdrop-blur-sm"
    onClick={onClose}
  />

  {/* Search layer */}
  <div className="relative z-10 h-full overflow-y-auto bg-[#111111]/95 text-white">
      {/* Blurred page behind */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
      />

      {/* Search page */}
      <div className="absolute inset-x-0 top-0 h-[92vh] overflow-hidden rounded-b-[32px] bg-[#111111] text-white shadow-2xl">
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">

            {/* Reduce / close arrow */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className="h-7 w-7" />
              </button>
            </div>

            {/* Search heading */}
            <div className="mt-2 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Search
              </p>

              <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
                Find something delicious
              </h2>
            </div>

            {/* Search input */}
            <form
              role="search"
              action="/blog"
              method="GET"
              className="relative mx-auto mt-8 max-w-4xl"
            >
              <label htmlFor="overlay-search" className="sr-only">
                Search recipes
              </label>

              <input
                id="overlay-search"
                name="q"
                type="search"
                autoFocus
                autoComplete="off"
                placeholder="Search recipes, ingredients, cooking tips..."
                className="h-14 w-full rounded-full border border-gray-600 bg-transparent px-6 pr-16 text-white placeholder:text-gray-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />

              <button
                type="submit"
                aria-label="Search"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition hover:bg-secondary"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>

            {/* Latest */}
            <section className="mt-10">
              <div className="group mb-5 flex items-center gap-4">
  <h3 className="shrink-0 text-sm font-bold uppercase tracking-[0.2em] text-primary">
    Latest
  </h3>

  <div className="h-px flex-1 bg-white/10 transition-colors duration-300 group-hover:bg-primary/40" />

  <Link
    href="/blog"
    onClick={onClose}
    className="shrink-0 text-sm text-gray-400 opacity-0 transition-all duration-300 group-hover:opacity-100 hover:text-white"
  >
    Show all
  </Link>
</div>

              {loading ? (
                <p className="py-12 text-center text-gray-400">
                  Loading articles...
                </p>
              ) : posts.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {posts.slice(0, 8).map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      onClick={onClose}
                      className="group"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-900">
                        {post.image ? (
                          <Image
                            src={post.image.url}
                            alt={post.image.alt || post.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            🍳
                          </div>
                        )}
                      </div>

                      <h4 className="mt-3 line-clamp-2 font-medium leading-snug text-white transition-colors group-hover:text-primary">
                        {post.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-gray-400">
                  No articles available.
                </p>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
</div>
  );
}