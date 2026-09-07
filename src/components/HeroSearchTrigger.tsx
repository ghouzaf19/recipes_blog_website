"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";

const SearchOverlay = dynamic(
  () => import("@/components/SearchOverlay"),
  { ssr: false },
);

export default function HeroSearchTrigger() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [shouldLoadSearch, setShouldLoadSearch] = useState(false);

  const openSearch = () => {
    setShouldLoadSearch(true);
    setIsSearchOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="relative mx-auto mt-6 block w-full max-w-xl"
      >
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <div className="w-full rounded-full border border-gray-300 bg-white py-3.5 pl-13 pr-28 text-left text-base text-gray-400 shadow-sm transition hover:border-[#A94F2B]">
          Search recipes...
        </div>

        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#A94F2B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F4022]">
          Search
        </span>
      </button>

      {shouldLoadSearch && (
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}
