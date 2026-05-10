import Header from "@/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | CookeTricks",
  description: "Get in touch with the CookeTricks team.",
};

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white font-sans text-gray-900">
      <Header />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-8">Contact Us</h1>
        
        <div className="prose prose-lg text-gray-700 leading-relaxed max-w-none mb-12">
          <p>
            Have a question, a recipe request, or just want to say hello? We'd love to hear from you! Reach out to us using the information below.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-medium text-gray-900 mb-6">Get In Touch</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-1 uppercase tracking-wider text-sm">Email</h3>
              <a href="mailto:hello@cooketricks.com" className="text-[#1a73e8] hover:text-[#F06D06] transition-colors text-lg">
                hello@cooketricks.com
              </a>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-1 uppercase tracking-wider text-sm">Partnerships</h3>
              <a href="mailto:partners@cooketricks.com" className="text-[#1a73e8] hover:text-[#F06D06] transition-colors text-lg">
                partners@cooketricks.com
              </a>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-1 uppercase tracking-wider text-sm">Social Media</h3>
              <p className="text-gray-700">
                Follow us on Instagram and Twitter for daily cooking inspiration: <br/>
                <span className="font-medium text-gray-900 mt-2 inline-block">@cooketricks</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
