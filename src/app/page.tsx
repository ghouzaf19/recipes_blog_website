import Image from "next/image";
import Link from "next/link";
import { Star, ChevronRight, Search } from "lucide-react";
import Header from "@/components/Header";
import { sanityFetch } from "@/sanity/lib/fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

type SanityAsset = { _ref: string };

interface PostCard {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt?: string;
  excerpt?: string;
  mainImage?: { asset: SanityAsset; alt?: string };
  prepTime?: number;
  cookTime?: number;
  difficulty?: "easy" | "medium" | "hard";
  servings?: number;
  cuisine?: string;
  author?: { name: string; image?: { asset: SanityAsset } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const revalidate = 0;

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

function imageUrl(assetRef: string, width = 800) {
  const cleaned = assetRef
    .replace("image-", "")
    .replace(/-([a-z]+)$/, ".$1")
    .replace(/-(\d+x\d+)-/, "-$1-");
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${cleaned}?w=${width}&fit=crop&auto=format`;
}

function getFallbackImage(slug: string) {
  const map: Record<string, string> = {
    'chicken-tikka-masala': '/blog-images/chicken-tikka-masala.png',
    'classic-french-onion-soup': '/blog-images/classic-french-onion-soup.png',
    'classic-margherita-pizza': '/blog-images/classic-margherita-pizza.png',
    'creamy-tuscan-chicken': '/blog-images/creamy-tuscan-chicken.png',
    'easy-weeknight-beef-tacos': '/blog-images/easy-weeknight-beef-tacos.png',
    'garlic-butter-shrimp-pasta': '/blog-images/garlic-butter-shrimp-pasta.png',
  };
  return map[slug] || null;
}

const categories = [
  { name: "Dinners", imgSrc: "/categories/dinners.png", href: "/blog?tag=dinners" },
  { name: "Meals", imgSrc: "/categories/meals.png", href: "/blog?tag=meals" },
  { name: "Ingredients", imgSrc: "/categories/ingredients.png", href: "/blog?tag=ingredients" },
  { name: "Occasions", imgSrc: "/categories/occasions.png", href: "/blog?tag=occasions" },
  { name: "Cuisines", imgSrc: "/categories/cuisines.png", href: "/blog?tag=cuisines" },
  { name: "Kitchen Tips", imgSrc: "/categories/tips.png", href: "/blog?tag=kitchen-tips" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  let posts: PostCard[] | null = null;
  let errorMsg: string | null = null;

  let featuredPost: PostCard | null = null;
  let theLatest: PostCard[] = [];
  let trendingPosts: PostCard[] = [];
  let sweetTreats: PostCard[] = [];
  let quickEasy: PostCard[] = [];

  try {
    posts = await sanityFetch<PostCard[]>({
      query: `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) [0..30] {
        _id, title, slug, publishedAt, excerpt,
        mainImage { asset, alt },
        prepTime, cookTime, difficulty, servings, cuisine,
        author->{ name, image { asset } }
      }`,
      tags: ["blog-index"],
    });
    
    if (posts) {
      featuredPost = posts[0] ?? null;
      theLatest = posts.slice(1, 5);
      trendingPosts = posts.length > 5 ? posts.slice(5, 9) : posts.slice(0, 4);
      sweetTreats = posts.length > 9 ? posts.slice(9, 13) : posts.slice(0, 4).reverse();
      quickEasy = posts.length > 13 ? posts.slice(13, 17) : posts.slice(0, 4);
    }
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    console.error("Sanity fetch failed:", error);
    if (error.code === 'EAI_AGAIN' || error?.message?.includes('fetch failed')) {
      errorMsg = "Network error: Unable to reach the database (Sanity API). Please check your internet connection.";
    } else {
      errorMsg = "An error occurred while loading posts.";
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CookeTricks",
    url: "https://www.cooketricks.com",
    description:
      "Master your kitchen with CookeTricks. Discover the best cooking tricks, expert culinary hacks, and delicious recipes.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.cooketricks.com/blog?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  // If there's an error, we just log it above and let the page render empty states gracefully.

  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 w-full pt-8">

        {/* ── Hero / The Latest (70/30 Split) ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
          
          {/* Main Featured (approx 70%) */}
          <div className="lg:col-span-8 group">
            {featuredPost ? (
              <Link href={`/blog/${featuredPost.slug.current}`} className="flex flex-col">
                <div className="relative aspect-[3/2] w-full mb-5 bg-gray-100">
                  {featuredPost.mainImage?.asset?._ref ? (
                    <Image
                      src={imageUrl(featuredPost.mainImage.asset._ref, 900)}
                      alt={featuredPost.mainImage.alt ?? featuredPost.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : getFallbackImage(featuredPost.slug.current) ? (
                    <Image
                      src={getFallbackImage(featuredPost.slug.current)!}
                      alt={featuredPost.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center rounded-2xl">
                      <span className="text-5xl">🍳</span>
                    </div>
                  )}
                </div>
                {/* Category Label */}
                <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-3">
                  {featuredPost.cuisine || "Featured Recipe"}
                </p>
                {/* Title (Serif) */}
                <h1 className="text-4xl md:text-5xl font-medium text-gray-900 leading-tight mb-4 group-hover:text-[#1a73e8] transition-colors">
                  {featuredPost.title}
                </h1>
                {/* Excerpt */}
                {featuredPost.excerpt && (
                  <p className="text-lg text-gray-700 leading-relaxed line-clamp-2">
                    {featuredPost.excerpt}
                  </p>
                )}
              </Link>
            ) : (
              <div className="py-20 text-center rounded-3xl bg-gray-50/50">
                <span className="text-5xl mb-6 block">🍳</span>
                <p className="text-gray-500 text-xl">New recipes coming soon — stay tuned!</p>
              </div>
            )}
          </div>

          {/* The Latest Sidebar (approx 30%) */}
          {theLatest.length > 0 && (
            <div className="lg:col-span-4 flex flex-col">
              <h2 className="text-2xl font-medium text-gray-900 mb-6">
                The Latest
              </h2>
              <div className="flex flex-col gap-6">
                {theLatest.map((post) => (
                  <Link
                    key={post._id}
                    href={`/blog/${post.slug.current}`}
                    className="group flex gap-4 items-center"
                  >
                    <div className="relative w-24 h-24 shrink-0 bg-gray-100 rounded-full md:rounded-none overflow-hidden">
                      {post.mainImage?.asset?._ref ? (
                        <Image
                          src={imageUrl(post.mainImage.asset._ref, 200)}
                          alt={post.mainImage.alt ?? post.title}
                          fill
                          sizes="100px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : getFallbackImage(post.slug.current) && (
                        <Image
                          src={getFallbackImage(post.slug.current)!}
                          alt={post.title}
                          fill
                          sizes="100px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                        {post.cuisine || "Recipe"}
                      </p>
                      <h3 className="font-medium text-base text-gray-900 group-hover:text-[#1a73e8] leading-snug line-clamp-2 transition-colors">
                        {post.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Giant Search Bar ───────────────────────────────────────── */}
        <section className="mb-20">
          <div className="bg-gray-50 rounded-3xl p-10 md:p-14 border border-gray-200 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              What are you craving?
            </h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto text-lg">
              Search over 500+ tested recipes to find exactly what you're looking for, from quick dinners to elaborate desserts.
            </p>
            <form action="/blog" method="GET" className="max-w-2xl mx-auto relative flex items-center">
              <Search className="w-6 h-6 text-gray-400 absolute left-6 pointer-events-none" />
              <input
                type="search"
                name="q"
                placeholder="Search recipes, ingredients, or cuisines..."
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-full pl-16 pr-32 py-5 text-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-3 bg-[#1a73e8] hover:bg-[#F06D06] text-white font-bold px-6 py-3 rounded-full transition-colors shadow-md"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {/* ── Trending Now ─────────────────────────────────────────── */}
        {trendingPosts.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-medium text-gray-900">
                Trending Now
              </h2>
              <Link
                href="/blog"
                className="font-medium text-[#1a73e8] hover:text-blue-700 uppercase tracking-wider text-sm flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {trendingPosts.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug.current}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[3/2] w-full mb-3 bg-gray-100 overflow-hidden">
                    {post.mainImage?.asset?._ref ? (
                      <Image
                        src={imageUrl(post.mainImage.asset._ref, 400)}
                        alt={post.mainImage.alt ?? post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : getFallbackImage(post.slug.current) && (
                      <Image
                        src={getFallbackImage(post.slug.current)!}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    {post.cuisine || "Recipe"}
                  </p>
                  <h3 className="font-medium text-gray-900 group-hover:text-[#1a73e8] text-lg leading-snug line-clamp-2 mb-2 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-1 flex-wrap text-[#F06D06]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured Recipe Highlight ──────────────────────────────── */}
        <section className="mb-20 mt-10">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            <div className="w-full lg:w-1/2">
              <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden shadow-xl">
                <Image 
                  src="https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1000&auto=format&fit=crop"
                  alt="Delicious Homemade Dessert"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized
                />
              </div>
            </div>
            <div className="w-full lg:w-1/2 flex flex-col justify-center text-center lg:text-left lg:pl-8">
              <span className="text-[#F06D06] font-bold tracking-widest uppercase text-sm mb-4 block">Reader Favorite</span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                The Best Weekend Pancakes
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                This homemade recipe has been our most popular post for over three years! Made from simple pantry ingredients, it yields the most incredibly fluffy, buttery, and golden results every single time. It's the perfect reason to wake up early on a Sunday.
              </p>
              <div className="flex justify-center lg:justify-start">
                <Link 
                  href="/blog" 
                  className="inline-block bg-gray-900 hover:bg-[#1a73e8] text-white font-bold px-8 py-4 rounded-full transition-colors shadow-md"
                >
                  Get the Recipe
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Sweet Treats & Cookies ─────────────────────────────────── */}
        {sweetTreats.length > 0 && (
          <section 
            className="mb-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-12 rounded-3xl relative overflow-hidden"
            style={{
              backgroundColor: '#fffbeb', // amber-50
              backgroundImage: 'radial-gradient(#f59e0b 2px, transparent 2px)', // amber-500 dots
              backgroundSize: '32px 32px'
            }}
          >
            <div className="absolute inset-0 bg-amber-50 opacity-80 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8 border-b border-amber-200/50 pb-4">
                <h2 className="text-3xl font-medium text-amber-900 bg-amber-50/50 inline-block pr-4">
                  Sweet Treats & Cookies
                </h2>
              <Link
                href="/blog?category=desserts"
                className="font-medium text-amber-700 hover:text-amber-900 uppercase tracking-wider text-sm flex items-center gap-1 transition-colors"
              >
                More Sweets <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {sweetTreats.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug.current}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-square w-full mb-3 bg-amber-100 rounded-2xl overflow-hidden shadow-sm">
                    {post.mainImage?.asset?._ref ? (
                      <Image
                        src={imageUrl(post.mainImage.asset._ref, 400)}
                        alt={post.mainImage.alt ?? post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : getFallbackImage(post.slug.current) && (
                      <Image
                        src={getFallbackImage(post.slug.current)!}
                        alt={post.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                  </div>
                  <p className="text-amber-600 text-[10px] uppercase font-bold tracking-wider mb-1">
                    Dessert
                  </p>
                  <h3 className="font-medium text-gray-900 group-hover:text-amber-700 text-lg leading-snug line-clamp-2 transition-colors">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>
            </div>
          </section>
        )}

        {/* ── Meet the Chef Persona ──────────────────────────────────── */}
        <section className="mb-20">
          <div className="bg-[#1a73e8] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-xl">
            <div className="w-full md:w-1/2 relative min-h-[400px]">
              <Image 
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=1000&auto=format&fit=crop"
                alt="Chef Cooke in the kitchen"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
            </div>
            <div className="w-full md:w-1/2 p-10 md:p-14 lg:p-20 flex flex-col justify-center text-white">
              <h2 className="text-sm font-bold tracking-widest uppercase mb-3 text-blue-200">Meet The Editor</h2>
              <h3 className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight">I believe that anyone can cook like a pro.</h3>
              <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                Hi, I'm Alex. After spending 10 years in professional kitchens across Europe, I realized that the best cooking secrets aren't complicated—they're just not widely shared. I created CookeTricks to bring restaurant-quality techniques into your everyday home cooking. 
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden relative bg-white">
                  <Image src="https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=200&auto=format&fit=crop" fill className="object-cover" alt="Author" unoptimized />
                </div>
                <div>
                  <p className="font-bold">Alex Cooke</p>
                  <p className="text-blue-200 text-sm">Founder & Head Chef</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Explore by Category ───────────────────────────────────── */}
        <section className="mb-20">
           <h2 className="text-3xl font-medium text-gray-900 mb-8">
            Explore
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="flex flex-col items-center group"
              >
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg border-2 border-transparent group-hover:border-blue-100">
                  <Image 
                    src={cat.imgSrc} 
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>
                <span className="font-medium text-gray-900 group-hover:text-[#1a73e8] uppercase tracking-wide text-sm transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Newsletter CTA ─────────────────────────────────────────── */}
        <section className="mb-20">
          <div 
            className="rounded-3xl p-10 md:p-16 text-center border border-gray-200 relative overflow-hidden shadow-sm"
            style={{
              backgroundColor: '#fcfbf9',
              backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          >
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full mix-blend-overlay opacity-40 -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#F06D06] rounded-full mix-blend-overlay opacity-10 translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="inline-block bg-white text-[#F06D06] text-sm font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6 shadow-sm border border-[#F06D06]/20">Weekly Inspiration</span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                Get our best recipes delivered to your inbox.
              </h2>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                Join 50,000+ home cooks who receive our weekly newsletter packed with seasonal recipes, pro kitchen hacks, and exclusive content you won't find on the blog.
              </p>
              
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="#">
                <input 
                  type="email" 
                  placeholder="Enter your email address..." 
                  className="flex-1 px-6 py-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent text-gray-900 shadow-sm"
                  required
                />
                <button 
                  type="submit" 
                  className="bg-[#1a73e8] hover:bg-[#F06D06] text-white font-bold px-8 py-4 rounded-full transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-sm text-gray-500 mt-4">No spam. Unsubscribe at any time.</p>
            </div>
          </div>
        </section>

        {/* ── Quick & Easy Meals ───────────────────────────────────── */}
        {quickEasy.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-medium text-gray-900">
                Quick & Easy Meals
              </h2>
              <Link
                href="/blog?tag=quick-dinners"
                className="font-medium text-primary hover:text-secondary uppercase tracking-wider text-sm flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {quickEasy.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug.current}`}
                  className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                    {post.mainImage?.asset?._ref ? (
                      <Image
                        src={imageUrl(post.mainImage.asset._ref, 400)}
                        alt={post.mainImage.alt ?? post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : getFallbackImage(post.slug.current) && (
                      <Image
                        src={getFallbackImage(post.slug.current)!}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-gray-900 flex items-center gap-1 shadow-sm">
                      ⏱️ {post.prepTime ? (post.prepTime + (post.cookTime || 0)) : 30} mins
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">
                      {post.cuisine || "Everyday"}
                    </p>
                    <h3 className="font-medium text-gray-900 group-hover:text-primary text-xl leading-snug line-clamp-2 mb-3 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mt-auto">
                      {post.excerpt || "A quick and delicious recipe perfect for busy weeknights when you need something fast but amazing."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>

    </main>
  );
}