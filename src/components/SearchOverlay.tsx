"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";

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
    <div className="border-t border-gray-800 bg-[#111111] text-white shadow-2xl">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Top */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">
            Search CookeTricks
          </h2>

          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <form
          role="search"
          action="/blog"
          method="GET"
          className="relative"
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
            className="h-14 w-full rounded-full border border-primary bg-transparent px-6 pr-16 text-white placeholder:text-gray-400 outline-none transition focus:ring-2 focus:ring-primary/30"
          />

          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition hover:bg-secondary"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        {/* Latest articles */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Latest
            </h3>

            <Link
              href="/blog"
              onClick={onClose}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Show all
            </Link>
          </div>

          {loading ? (
            <p className="py-10 text-sm text-gray-400">
              Loading articles...
            </p>
          ) : posts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {posts.slice(0, 8).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  onClick={onClose}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-900">
                    {post.image ? (
                      <Image
                        src={post.image.url}
                        alt={post.image.alt || post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🍳
                      </div>
                    )}
                  </div>

                  <h4 className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-white transition-colors duration-200 group-hover:text-primary">
                    {post.title}
                  </h4>

                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {post.contentType === "recipe"
                      ? "Recipe"
                      : "Cooking Guide"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-10 text-sm text-gray-400">
              No articles available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}