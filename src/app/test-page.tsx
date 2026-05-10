import Link from "next/link";

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-50 via-pink-50 to-indigo-50">
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">🎉 Food Blog is Working!</h1>
        <p className="text-lg text-gray-600 mb-8">
          The Extreme SEO Food Blog Engine is properly configured and ready for recipes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/blog" 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors transform hover:-scale-105"
          >
            View Blog Recipes
          </Link>
          <a 
            href="http://localhost:3000" 
            className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-800 transition-colors transform hover:-scale-105"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div>
  );
}