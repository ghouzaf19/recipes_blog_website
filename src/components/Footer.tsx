import Link from "next/link";
import { Utensils } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-50 pt-16 pb-8 mt-auto border-t border-gray-200 w-full shrink-0">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row justify-between mb-12 border-b border-gray-200 pb-12 gap-8">
          {/* Brand */}
          <div className="lg:w-1/3">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="bg-primary p-2 rounded-full hidden sm:block">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <span className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                Cooke<span className="text-primary tracking-tighter">Tricks</span>
              </span>
            </Link>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed border-l-4 border-primary pl-3">
              Everyday cooking hacks and recipes that actually work, tested by real home cooks. 
              Focus on the food, not the fuss.
            </p>
          </div>

          {/* Links */}
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-8 lg:w-1/2 text-sm font-semibold text-gray-900 uppercase tracking-wider leading-loose"
          >
            <div>
              <p className="text-gray-900 font-bold mb-4">Recipes</p>
              <ul className="text-gray-600 font-normal normal-case tracking-normal">
                {["Dinners", "Meals", "Ingredients", "Occasions"].map((l) => (
                  <li key={l} className="mb-2">
                    <Link
                      href={`/blog?tag=${l.toLowerCase()}`}
                      className="hover:text-primary transition-colors"
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-900 font-bold mb-4">Learn More</p>
              <ul className="text-gray-600 font-normal normal-case tracking-normal">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ].map((item) => (
                  <li key={item.label} className="mb-2">
                    <Link href={item.href} className="hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="text-center text-xs text-gray-500 font-medium">
          <p>© {new Date().getFullYear()} CookeTricks. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
