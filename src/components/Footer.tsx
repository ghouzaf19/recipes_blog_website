import Link from 'next/link';
import { Utensils } from 'lucide-react';

const recipeLinks = [
  {
    label: 'Dinners',
    href: '/blog?mealType=dinner',
  },
  {
    label: 'Breakfast',
    href: '/blog?mealType=breakfast',
  },
  {
    label: 'Vegetarian',
    href: '/blog?diet=vegetarian',
  },
  {
    label: 'Holidays',
    href: '/blog?occasion=holidays',
  },
];

const informationLinks = [
  {
    label: 'About Us',
    href: '/about',
  },
  {
    label: 'Editorial Team',
    href: '/authors/cooke-tricks-editorial',
  },
  {
    label: 'Editorial Policy',
    href: '/editorial-policy',
  },
  {
    label: 'Contact',
    href: '/contact',
  },
  {
    label: 'Privacy Policy',
    href: '/privacy',
  },
  {
    label: 'Terms of Service',
    href: '/terms',
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-gray-200 bg-gray-50 pb-8 pt-16">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-8 border-b border-gray-200 pb-12 lg:flex-row">
          {/* Brand */}
          <div className="lg:w-1/3">
            <Link
              href="/"
              className="mb-6 flex items-center gap-2"
            >
              <div className="hidden rounded-full bg-primary p-2 sm:block">
                <Utensils className="h-6 w-6 text-white" />
              </div>

              <span className="font-serif text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Cooke
                <span className="tracking-tighter text-primary">
                  Tricks
                </span>
              </span>
            </Link>

            <p className="mb-4 border-l-4 border-primary pl-3 text-sm leading-relaxed text-gray-600">
              Practical recipes and cooking guides for
              busy home cooks. Clear instructions,
              useful kitchen tips and transparent
              editorial standards.
            </p>
          </div>

          {/* Links */}
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-8 text-sm font-semibold uppercase leading-loose tracking-wider text-gray-900 lg:w-1/2"
          >
            <div>
              <p className="mb-4 font-bold text-gray-900">
                Recipes
              </p>

              <ul className="font-normal normal-case tracking-normal text-gray-600">
                {recipeLinks.map((item) => (
                  <li
                    key={item.label}
                    className="mb-2"
                  >
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 font-bold text-gray-900">
                Learn More
              </p>

              <ul className="font-normal normal-case tracking-normal text-gray-600">
                {informationLinks.map((item) => (
                  <li
                    key={item.label}
                    className="mb-2"
                  >
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="text-center text-xs font-medium text-gray-500">
          <p>
            © {new Date().getFullYear()}{' '}
            CookeTricks. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}