import type { Metadata } from 'next';
import Link from 'next/link';

import Header from '@/components/Header';
import { SITE_URL } from '@/lib/wordpress';

export const metadata: Metadata = {
  title: 'Editorial Policy',
  description:
    'Learn how CookeTricks creates, reviews, tests, updates and corrects recipes and cooking guides.',
  alternates: {
    canonical: `${SITE_URL}/editorial-policy`,
  },
};

export default function EditorialPolicyPage() {
  return (
    <>
      <Header />

      <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-16 sm:px-6">
        <header className="mb-12 border-b border-gray-200 pb-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            CookeTricks standards
          </p>

          <h1 className="mb-6 text-5xl leading-tight md:text-6xl">
            Editorial Policy
          </h1>

          <p className="max-w-3xl text-xl leading-relaxed text-gray-600">
            CookeTricks creates practical recipes and
            cooking guides for home cooks. This policy
            explains how we research, prepare, review,
            label, update and correct our content.
          </p>

          <p className="mt-5 text-sm text-gray-500">
            Last updated: August 25, 2026
          </p>
        </header>

        <div className="space-y-12 text-lg leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Our editorial mission
            </h2>

            <p>
              Our goal is to help busy home cooks make
              reliable meals with clear instructions,
              practical substitutions, realistic timing
              guidance and useful food-safety
              information. We focus on the food and the
              cooking process without unnecessary
              filler.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              How we create content
            </h2>

            <p className="mb-4">
              Each recipe or cooking guide begins with a
              defined reader question or cooking problem.
              During preparation, we may review
              authoritative food-safety guidance,
              manufacturer instructions and relevant
              culinary references.
            </p>

            <p>
              Sources that materially support safety,
              storage, factual or technical claims are
              listed in the article when appropriate.
              External sources do not replace our own
              editorial review or recipe-testing
              requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Recipe testing and draft labels
            </h2>

            <p className="mb-4">
              A recipe must not be presented as tested
              unless it has been prepared and evaluated
              by a human reviewer. Testing may include
              ingredient quantities, cooking time,
              appliance settings, yield, texture,
              flavor, storage and reheating.
            </p>

            <p>
              Recipes that still require testing remain
              unpublished editorial drafts. Internal
              previews are clearly marked “Needs
              testing” and are not intended for public
              use.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Food safety
            </h2>

            <p>
              We aim to distinguish culinary preference
              from food-safety requirements. When an
              article includes minimum internal
              temperatures, storage limits or similar
              safety guidance, we prioritize recognized
              public-health and government sources.
              Readers should account for their
              ingredients, equipment, allergies and
              individual circumstances.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Nutrition information
            </h2>

            <p>
              Nutrition values are estimates unless
              explicitly stated otherwise. Values can
              change depending on ingredient brands,
              substitutions, portion sizes and
              preparation methods. Nutrition data is not
              marked as reviewed until it has undergone
              the appropriate editorial check.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Images and visual accuracy
            </h2>

            <p>
              We identify image creators and external
              image sources when relevant. Illustrative,
              edited or AI-assisted visuals are disclosed
              when their use could affect a reader’s
              understanding of how the finished recipe
              actually looks. An illustrative image is
              not treated as evidence that a recipe was
              physically tested.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Use of artificial intelligence
            </h2>

            <p>
              CookeTricks may use AI tools to assist with
              outlining, editing, formatting, research
              organization or illustrative images.
              AI-assisted material remains subject to
              human editorial review. AI assistance does
              not replace physical recipe testing,
              authorship accountability, source
              verification or factual review.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Updates and corrections
            </h2>

            <p className="mb-4">
              We may update articles to improve clarity,
              correct errors, reflect testing results,
              replace images, update sources or revise
              instructions. Materially updated content
              may display an updated date.
            </p>

            <p>
              If you identify a possible error, send the
              article URL and a clear description through
              our{' '}
              <Link
                href="/contact"
                className="font-semibold text-primary hover:underline"
              >
                contact page
              </Link>
              . We review correction requests and update
              the content when a correction is warranted.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-3xl text-gray-950">
              Independence and commercial content
            </h2>

            <p>
              Sponsorships, affiliate relationships or
              other commercial arrangements must not
              determine our food-safety conclusions or
              permit undisclosed editorial influence.
              Relevant commercial relationships will be
              disclosed clearly when applicable.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-8">
            <h2 className="mb-4 text-3xl text-gray-950">
              Editorial responsibility
            </h2>

            <p className="mb-5">
              CookeTricks Editorial is responsible for
              applying these standards and reviewing
              published corrections and updates.
            </p>

            <Link
              href="/authors/cooke-tricks-editorial"
              className="font-semibold text-primary hover:underline"
            >
              Meet CookeTricks Editorial
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}