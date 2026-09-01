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
    {/* Blurred page/header behind */}
<div
  className="absolute inset-x-0 top-0 h-[145px] bg-black/10 backdrop-blur-[6px]"
  onClick={onClose}
/>

    {/* Search surface starts below header */}
    <div className="absolute inset-x-0 top-[145px] bottom-0 z-10 overflow-y-auto bg-[#111111] text-white">
      <div className="mx-auto w-full max-w-[1195px] px-4 pb-16 pt-3 sm:px-0">

        {/* Reduce / close arrow */}
        <div className="-mt-14 mb-3 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-10 w-10 items-center justify-center text-gray-300 transition-colors hover:text-white"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>

        {/* Search form */}
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();

            const formData = new FormData(e.currentTarget);
            const query = String(formData.get("q") || "").trim();

            if (!query) return;

            window.location.href = `/blog?q=${encodeURIComponent(query)}`;
          }}
          className="relative mx-auto max-w-none"
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
            placeholder="Search..."
            className="h-12 w-full rounded-full border border-primary bg-transparent px-5 pr-14 text-white placeholder:text-gray-400 outline-none transition focus:ring-1 focus:ring-primary"
          />

          <button
            type="submit"
            aria-label="Search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-white"
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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