"use client";

import { Search, X } from "lucide-react";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({
  isOpen,
  onClose,
}: SearchOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-gray-900">
            Search CookeTricks
          </h2>

          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
            className="h-14 w-full rounded-full border border-gray-300 bg-white px-6 pr-16 text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white transition-all duration-200 hover:bg-secondary"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Popular searches
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/blog?category=chicken"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              Chicken
            </a>

            <a
              href="/blog?category=kitchen-tips"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              Kitchen Tips
            </a>

            <a
              href="/blog?mealType=dinner"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              Dinner
            </a>

            <a
              href="/blog?q=air+fryer"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-primary hover:text-primary"
            >
              Air Fryer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}