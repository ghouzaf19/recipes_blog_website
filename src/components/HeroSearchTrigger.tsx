"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";

export default function HeroSearchTrigger() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSearchOpen(true)}
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

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}