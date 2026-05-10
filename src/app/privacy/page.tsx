import Header from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | CookeTricks",
  description: "Privacy Policy for CookeTricks.",
};

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <Header />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        
        <div className="prose prose-lg text-gray-700 leading-relaxed max-w-none">
          <p className="mb-6">
            At CookeTricks, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
          </p>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Information We Collect</h2>
          <p className="mb-6">
            We may collect information about you in a variety of ways. The information we may collect on the Site includes:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
          </ul>
          
          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Use of Your Information</h2>
          <p className="mb-6">
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Create and manage your account.</li>
            <li>Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the Site to you.</li>
            <li>Email you regarding your account or order.</li>
            <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
          </ul>

          <h2 className="text-2xl font-medium text-gray-900 mt-10 mb-4">Contact Us</h2>
          <p className="mb-6">
            If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:privacy@cooketricks.com" className="text-[#1a73e8] hover:underline">privacy@cooketricks.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
