import Header from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | CookeTricks",
  description: "Learn more about CookeTricks and our mission to share expert culinary hacks.",
};

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <Header />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-8">About CookeTricks</h1>
        
        <div className="prose prose-lg text-gray-700 leading-relaxed max-w-none">
          <p className="mb-6">
            Welcome to CookeTricks, your ultimate destination for culinary inspiration, expert hacks, and everyday recipes that actually work. Our mission is to empower home cooks of all skill levels to step into the kitchen with confidence.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Our Story</h2>
          <p className="mb-6">
            CookeTricks was born out of a simple idea: cooking should not be intimidating. With clear instructions and useful context, home cooks can approach new dishes with more confidence.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">What We Do</h2>
          <p className="mb-6">
            We publish recipes and cooking guides with clear authorship, dates, ingredients, instructions, and practical notes. When a recipe has been tested, its recipe card identifies the test information provided by the editor.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Join Our Community</h2>
          <p className="mb-6">
            Food is best when shared. Join our community of passionate home cooks as we explore new flavors, master new techniques, and celebrate the joy of cooking together.
          </p>
        </div>
      </div>
    </main>
  );
}
