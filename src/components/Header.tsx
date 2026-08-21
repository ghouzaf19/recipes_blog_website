"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Menu, ChevronDown, Utensils, X } from "lucide-react";

const navItems = [
  {
    name: "Dinners",
    href: "/blog?mealType=dinner",
    items: [
      { label: "Quick Dinners", href: "/blog?tag=quick-dinners" },
      { label: "Healthy Dinners", href: "/blog?tag=healthy-dinners" },
      { label: "Kid-Friendly", href: "/blog?tag=kid-friendly" },
    ],
  },
  {
    name: "Meals",
    href: "/blog",
    items: [
      { label: "Breakfast", href: "/blog?mealType=breakfast" },
      { label: "Lunch", href: "/blog?mealType=lunch" },
      { label: "Appetizers", href: "/blog?mealType=appetizers" },
      { label: "Soups", href: "/blog?mealType=soups" },
    ],
  },
  {
    name: "Ingredients",
    href: "/blog?category=ingredients",
    items: [
      { label: "Chicken", href: "/blog?tag=chicken" },
      { label: "Beef", href: "/blog?tag=beef" },
      { label: "Seafood", href: "/blog?tag=seafood" },
      { label: "Vegetarian", href: "/blog?diet=vegetarian" },
    ],
  },
  {
    name: "Occasions",
    href: "/blog",
    items: [
      { label: "Holidays", href: "/blog?occasion=holidays" },
      { label: "Party Recipes", href: "/blog?occasion=party-recipes" },
      { label: "Date Night", href: "/blog?occasion=date-night" },
    ],
  },
  {
    name: "Cuisines",
    href: "/blog",
    items: [
      { label: "Italian", href: "/blog?cuisine=italian" },
      { label: "Mexican", href: "/blog?cuisine=mexican" },
      { label: "Asian", href: "/blog?cuisine=asian" },
      { label: "Indian", href: "/blog?cuisine=indian" },
    ],
  },
  {
    name: "Kitchen Tricks",
    href: "/blog?category=kitchen-tricks",
    items: [
      { label: "Prep Hacks", href: "/blog?tag=prep-hacks" },
      { label: "Storage Secrets", href: "/blog?tag=storage" },
      { label: "Flavor Boosters", href: "/blog?tag=flavor" },
    ],
  },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
    setMobileExpanded(null);
  };

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* Top bar: Logo + Search + Hamburger */}
        <div className="max-w-[1240px] mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-4">
              <button
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                className="lg:hidden text-gray-700 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>

              <Link href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
                <div className="bg-primary p-2 rounded-full hidden sm:block">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <span className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                  Cooke<span className="text-primary tracking-tighter">Tricks</span>
                </span>
              </Link>
            </div>

            {/* Center: Search bar (desktop) */}
            <form
              role="search"
              action="/blog"
              method="GET"
              className="hidden lg:flex flex-1 max-w-2xl relative"
            >
              <label htmlFor="site-search" className="sr-only">
                Search recipes
              </label>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Find a recipe or ingredient…"
                className="w-full bg-gray-100 border border-gray-300 text-gray-900 rounded-full px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-2 top-1.5 bottom-1.5 bg-primary text-white p-2.5 rounded-full hover:bg-secondary transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Right: mobile search icon */}
            <div className="flex items-center gap-4 lg:hidden">
              <Link href="/blog" aria-label="Search recipes">
                <Search className="w-6 h-6 text-gray-700 hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Secondary Nav (Desktop dropdowns) */}
        <nav
          ref={menuRef}
          aria-label="Main navigation"
          className="hidden lg:block border-t border-gray-100 bg-gray-50/50"
        >
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
            <ul className="flex items-center justify-between text-sm font-bold text-gray-800 uppercase tracking-wider">
              {navItems.map((item) => (
                <li
                  key={item.name}
                  className="relative py-4"
                  onMouseEnter={() => setActiveSubmenu(item.name)}
                  onMouseLeave={() => setActiveSubmenu(null)}
                >
                  <button
                    aria-haspopup="true"
                    aria-expanded={activeSubmenu === item.name}
                    className="hover:text-primary transition-colors flex items-center gap-1 py-2 font-bold uppercase cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    onClick={() =>
                      setActiveSubmenu(activeSubmenu === item.name ? null : item.name)
                    }
                  >
                    {item.name}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        activeSubmenu === item.name ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  {activeSubmenu === item.name && (
                    <div
                      role="menu"
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-0 min-w-[180px] bg-white shadow-xl border-t-2 border-primary rounded-b-lg py-3 px-4 z-50 animate-fadeIn"
                    >
                      {item.items.map((sub) => (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          role="menuitem"
                          className="block py-2 px-2 text-gray-700 hover:text-primary font-medium transition-colors text-sm hover:bg-blue-50 rounded"
                          onClick={() => setActiveSubmenu(null)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile menu backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobileMenu}
      />

      {/* Mobile slide-out menu */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <Link
            href="/"
            className="font-serif text-2xl font-extrabold tracking-tight text-gray-900"
            onClick={closeMobileMenu}
          >
            Cooke<span className="text-primary tracking-tighter">Tricks</span>
          </Link>
          <button
            aria-label="Close menu"
            onClick={closeMobileMenu}
            className="text-gray-500 hover:text-primary focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile search */}
        <div className="p-4 border-b border-gray-200">
          <form role="search" action="/blog" method="GET" className="relative w-full">
            <label htmlFor="mobile-search" className="sr-only">Search recipes</label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search recipes…"
              className="w-full bg-gray-100 border border-gray-300 text-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1 bottom-1 text-gray-500 hover:text-primary transition-colors px-2"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Mobile nav items */}
        <nav className="overflow-y-auto flex-1 py-2" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <div key={item.name} className="border-b border-gray-100 last:border-0">
              <button
                aria-expanded={mobileExpanded === item.name}
                onClick={() =>
                  setMobileExpanded(mobileExpanded === item.name ? null : item.name)
                }
                className="w-full px-4 py-4 flex items-center justify-between text-left font-bold text-gray-900 uppercase tracking-wider text-sm hover:bg-gray-50 transition-colors"
              >
                {item.name}
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    mobileExpanded === item.name ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              {mobileExpanded === item.name && (
                <div className="bg-gray-50 px-4 py-2">
                  {item.items.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      className="block py-3 pl-4 text-sm font-medium text-gray-600 hover:text-primary hover:translate-x-1 transition-all"
                      onClick={closeMobileMenu}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile footer link to blog */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Link
            href="/blog"
            onClick={closeMobileMenu}
            className="block w-full text-center bg-primary text-white font-bold py-3 rounded-lg hover:bg-secondary transition-colors uppercase tracking-wider text-sm"
          >
            Browse All Recipes
          </Link>
        </div>
      </div>
    </>
  );
}
