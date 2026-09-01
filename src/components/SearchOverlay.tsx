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

  /*
   * Keep the original page in place while
   * the search experience is open.
   */
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  /*
   * Load latest articles automatically.
   * The user does not need to type anything first.
   */
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

        setPosts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Search overlay fetch failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [isOpen, posts.length]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Page behind search */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search page */}
      <div className="relative z-10 h-full overflow-y-auto overscroll-contain bg-[#111111]/95 text-white">
        <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          {/* Reduce / close arrow */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className="h-7 w-7" />
            </button>
          </div>

          {/* Search heading */}
          <div className="mt-1 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Search
            </p>

            <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              Find something delicious
            </h2>
          </div>

          {/* Search form */}
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
              className="h-14 w-full rounded-full border border-gray-600 bg-transparent px-6 pr-16 text-white placeholder:text-gray-400 outline-none transition-all duration-200 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/30"
            />

            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-all duration-200 hover:bg-secondary"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>

          {/* Latest */}
          <section className="mt-10">
            <div className="group mb-6 flex items-center">
              <Link
                href="/blog"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                  Latest
                </h3>

                <span className="text-xl leading-none text-primary transition-transform duration-200 group-hover:translate-x-1">
                  ›
                </span>
              </Link>

              <Link
                href="/blog"
                onClick={onClose}
                className="ml-3 text-sm text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-white"
              >
                Show all
              </Link>
            </div>

            {loading ? (
              <p className="py-12 text-sm text-gray-400">
                Loading articles...
              </p>
            ) : posts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          🍳
                        </div>
                      )}
                    </div>

                    <h4 className="mt-3 line-clamp-2 font-medium leading-snug text-white transition-colors duration-200 group-hover:text-primary">
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
              <p className="py-12 text-sm text-gray-400">
                No articles available.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}