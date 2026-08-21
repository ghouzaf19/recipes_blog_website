import Header from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | CookeTricks",
  description: "Terms of Service for CookeTricks.",
};

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <Header />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        
        <div className="prose prose-lg text-gray-700 leading-relaxed max-w-none">
          <p className="mb-6">
            These Terms of Service describe the agreement between you and CookeTricks concerning access to and use of this website and related services.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Intellectual Property Rights</h2>
          <p className="mb-6">
            Unless otherwise indicated, the site and its original content are owned by or licensed to CookeTricks and may be protected by applicable intellectual-property laws.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">User Representations</h2>
          <p className="mb-6">
            By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Terms of Service.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Prohibited Activities</h2>
          <p className="mb-6">
            You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
          </p>

          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Modifications and Interruptions</h2>
          <p className="mb-6">
            We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Site. We also reserve the right to modify or discontinue all or part of the Site without notice at any time.
          </p>
        </div>
      </div>
    </main>
  );
}
