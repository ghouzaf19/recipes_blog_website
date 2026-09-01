"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

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

  const latestRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateLatestArrows = () => {
    const el = latestRef.current;

    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 5);

    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 5
    );
  };

  const scrollLatest = (direction: "left" | "right") => {
    const el = latestRef.current;

    if (!el) return;

    el.scrollBy({
      left: direction === "right" ? 640 : -640,
      behavior: "smooth",
    });

    window.setTimeout(() => {
      updateLatestArrows();
    }, 350);
  };

  /*
   * Lock page scrolling while search is open
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
   * Load latest posts
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

  /*
   * Detect if arrows are needed
   */
  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      updateLatestArrows();
    }, 150);

    window.addEventListener("resize", updateLatestArrows);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateLatestArrows);
    };
  }, [isOpen, posts]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Blurred header behind */}
      <div
        className="absolute inset-x-0 top-0 h-[145px] bg-black/10 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Search surface */}
      <div className="absolute inset-x-0 top-[145px] bottom-0 z-10 overflow-y-auto bg-white text-gray-900 dark:bg-[#111111] dark:text-white">
        <div className="mx-auto w-full max-w-[1195px] px-4 pb-16 pt-3 sm:px-0">
          {/* Reduce / close arrow */}
          <div className="fixed left-1/2 top-[108px] z-[120] -translate-x-1/2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-10 w-10 items-center justify-center text-white/90 transition hover:text-[#A94F2B]"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>

          {/* Search */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();

              const formData = new FormData(e.currentTarget);

              const query = String(
                formData.get("q") || ""
              ).trim();

              if (!query) return;

              window.location.href = `/blog?q=${encodeURIComponent(
                query
              )}`;
            }}
            className="relative w-full"
          >
            <label
              htmlFor="overlay-search"
              className="sr-only"
            >
              Search recipes
            </label>

            <input
              id="overlay-search"
              name="q"
              type="search"
              autoFocus
              autoComplete="off"
              placeholder="Search..."
              className="h-12 w-full rounded-full border border-[#A94F2B] bg-transparent px-5 pr-14 text-gray-900 placeholder:text-gray-500 outline-none transition focus:ring-1 focus:ring-[#A94F2B] dark:text-white dark:placeholder:text-gray-400"
            />

            <button
              type="submit"
              aria-label="Search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-[#A94F2B]"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>

          {/* Latest */}
          <section className="mt-10">
            <div className="group/latest mb-6 flex items-center">
              <Link
                href="/blog"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <h3 className="text-sm font-medium uppercase tracking-[0.2em] !text-gray-900 transition-colors duration-200 group-hover/latest:!text-[#D96A3A] dark:!text-white">
  Latest
</h3>

                <ChevronRight className="h-4 w-4 !text-gray-900 transition-all duration-200 group-hover/latest:translate-x-1 group-hover/latest:!text-[#D96A3A] dark:!text-white" />
              </Link>

              <Link
                href="/blog"
                onClick={onClose}
                className="ml-3 -translate-x-1 text-sm text-white/50 opacity-0 transition-all duration-200 group-hover/latest:translate-x-0 group-hover/latest:opacity-100 hover:text-[#D96A3A]"
              >
                Show all
              </Link>
            </div>

            {loading ? (
              <p className="py-12 text-sm text-gray-400">
                Loading articles...
              </p>
            ) : posts.length > 0 ? (
              <div className="group relative">
                {/* Left arrow */}
                {canScrollLeft && (
  <button
    type="button"
    onClick={() => scrollLatest("left")}
    aria-label="Previous articles"
    className="absolute left-2 top-[72px] z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#A94F2B] text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100 hover:bg-[#D96A3A]"
  >
    <ChevronLeft className="h-5 w-5" />
  </button>
)}

                {/* Posts rail */}
                <div
                  ref={latestRef}
                  onScroll={updateLatestArrows}
                  className="flex gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      onClick={onClose}
                      className="group/card w-[145px] shrink-0"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-gray-900">
                        {post.image ? (
                          <Image
                            src={post.image.url}
                            alt={
                              post.image.alt ||
                              post.title
                            }
                            fill
                            sizes="145px"
                            className="object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            🍳
                          </div>
                        )}
                      </div>

                      <h4 className="mt-3 line-clamp-2 text-sm font-medium leading-snug !text-gray-900 transition-colors duration-200 group-hover/card:!text-[#D96A3A] dark:!text-white">
  {post.title}
</h4>

                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        {post.contentType === "recipe"
                          ? "Recipe"
                          : "Cooking Guide"}
                      </p>
                    </Link>
                  ))}
                </div>

                {/* Right arrow */}
               {canScrollRight && (
  <button
    type="button"
    onClick={() => scrollLatest("right")}
    aria-label="Next articles"
    className="absolute right-2 top-[72px] z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#A94F2B] text-white opacity-0 shadow-md transition-all duration-200 hover:bg-[#D96A3A] group-hover:opacity-100"
  >
    <ChevronRight className="h-5 w-5" />
  </button>
)}
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