import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/Header';
import { SITE_URL } from '@/lib/wordpress';

export const metadata: Metadata = {
  title: 'Recipe Testing Policy',
  description:
    'Learn how CookeTricks tests recipes, records results and distinguishes tested recipes from editorial drafts.',
  alternates: {
    canonical: `${SITE_URL}/recipe-testing`,
  },
};

export default function RecipeTestingPage() {
  return (
    <>
      <Header />

      <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-16 sm:px-6">
        <header className="mb-12 border-b border-gray-200 pb-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            CookeTricks standards
          </p>

          <h1 className="mb-6 text-5xl leading-tight md:text-6xl">
            Recipe Testing Policy
          </h1>

          <p className="max-w-3xl text-xl leading-relaxed text-gray-600">
            This policy explains what CookeTricks means
            when a recipe is described as tested, how
            results are recorded and how untested drafts
            are handled.
          </p>

          <p className="mt-5 text-sm text-gray-500">
            Last updated: August 25, 2026
          </p>
        </header>

        <div className="space-y-12 text-lg leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              What “tested” means
            </h2>

            <p>
              CookeTricks describes a recipe as tested
              only after a human reviewer has physically
              prepared it and recorded the relevant
              results. AI-generated text, research,
              calculations or illustrative images do not
              count as physical recipe testing.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              What we evaluate
            </h2>

            <p className="mb-4">
              Depending on the recipe, testing may
              evaluate:
            </p>

            <ul className="list-disc space-y-3 pl-6">
              <li>
                Ingredient quantities and preparation.
              </li>
              <li>
                Equipment or appliance model and
                settings.
              </li>
              <li>
                Cooking time and resting time.
              </li>
              <li>
                Yield and realistic serving count.
              </li>
              <li>
                Texture, flavor, browning and moisture.
              </li>
              <li>
                Important substitutions or variations.
              </li>
              <li>
                Storage, freezing and reheating
                guidance.
              </li>
              <li>
                Food-safety measurements when relevant.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Cooking times and equipment
            </h2>

            <p>
              Cooking times can vary because of
              ingredient size, thickness, starting
              temperature, altitude and equipment.
              Appliance recipes should identify relevant
              equipment details when available. Readers
              should use visual and measurable doneness
              indicators rather than relying only on a
              timer.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Food-safety checks
            </h2>

            <p>
              When temperature is relevant, testing
              should use an appropriate food thermometer
              in the correct location. Our articles aim
              to distinguish a preferred culinary result
              from a minimum safety requirement and may
              cite recognized government or
              public-health guidance.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Test records
            </h2>

            <p>
              Internal test records may include the test
              date, reviewer, ingredient measurements,
              equipment, settings, actual cooking time,
              final temperature, yield, observations and
              revisions required before publication.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Untested editorial drafts
            </h2>

            <p>
              Recipes that have not completed the
              required physical test remain unpublished
              drafts. Preview pages may contain
              provisional quantities, timing, nutrition
              or instructions and are clearly labeled
              “Needs testing.” These previews are not
              presented as final recipes.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Retesting and updates
            </h2>

            <p>
              We may retest a recipe after significant
              ingredient, method or equipment changes.
              Published recipes may also be updated to
              improve clarity, incorporate verified
              results or correct an identified issue.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Nutrition estimates
            </h2>

            <p>
              Nutrition information is separate from
              physical recipe testing. Nutrition values
              remain estimates unless they have been
              calculated and reviewed using the final
              tested ingredients, yield and serving
              size.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8">
            <h2 className="mb-4 text-3xl text-gray-950">
              Questions or corrections
            </h2>

            <p className="mb-5">
              If you have a question about a recipe or
              believe a published instruction should be
              reviewed, include the recipe URL and
              relevant details in your message.
            </p>

            <div className="flex flex-wrap gap-5">
              <Link
                href="/contact"
                className="font-semibold text-primary hover:underline"
              >
                Contact CookeTricks
              </Link>

              <Link
                href="/editorial-policy"
                className="font-semibold text-primary hover:underline"
              >
                Read our Editorial Policy
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}