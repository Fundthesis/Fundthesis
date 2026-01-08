import Link from 'next/link';
import { ArrowRight, BarChart2, Globe, TrendingUp, Users, Brain, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 text-[#1a1a1a] dark:text-stone-100 font-serif">
      <main className="max-w-7xl mx-auto px-4 py-12">

        {/* Masthead */}
        <div className="border-b-8 border-black dark:border-stone-100 pb-8 mb-12 text-center">
          <div className="flex justify-between items-end mb-4 border-b border-black/20 dark:border-stone-700 pb-2">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400">Vol. I, No. 1</p>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">New York, NY</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-stone-400">Daily Edition</p>
              <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400">{new Date().getFullYear()}</p>
            </div>
          </div>

          <h1 className="text-7xl md:text-9xl font-black tracking-tight uppercase leading-none mb-4 dark:text-white">
            Fundthesis
          </h1>

          <div className="flex justify-center items-center gap-8 py-2 border-y-2 border-black/10 dark:border-stone-700 text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-stone-300">
            <span>Invest Smarter</span>
            <span className="w-1 h-1 bg-black dark:bg-stone-100 rounded-full"></span>
            <span>AI Powered</span>
            <span className="w-1 h-1 bg-black dark:bg-stone-100 rounded-full"></span>
            <span>Global Reach</span>
          </div>
        </div>

        {/* Lead Story */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 border-b-2 border-black/10 dark:border-stone-700 pb-16">
          <div className="lg:col-span-8">
            <div className="prose max-w-none dark:prose-invert">
              <h2 className="text-5xl font-bold leading-tight mb-6 dark:text-white">
                The Future of Investing is Here: <br />
                <span className="italic font-serif">A New Era of Intelligence.</span>
              </h2>

              <p className="text-2xl leading-relaxed text-gray-800 dark:text-stone-200 mb-8 font-serif">
                <span className="float-left text-7xl font-black mr-4 mt-[-10px] leading-none dark:text-white">F</span>
                undThesis isn&apos;t just a platform; it&apos;s a paradigm shift. In a world awash with noise, we provide the signal. By combining institutional-grade data with next-generation AI, we empower the individual investor to compete with the giants.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                <div className="bg-stone-100 dark:bg-stone-800 p-8 border-t-4 border-black dark:border-green-500">
                  <TrendingUp className="w-10 h-10 mb-4 text-black dark:text-green-400" />
                  <h3 className="text-xl font-bold uppercase tracking-wider mb-2 dark:text-white">Market Insights</h3>
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-stone-300">
                    Real-time analysis of global trends, stripped of jargon and delivered with clarity.
                  </p>
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 p-8 border-t-4 border-black dark:border-green-500">
                  <Brain className="w-10 h-10 mb-4 text-black dark:text-green-400" />
                  <h3 className="text-xl font-bold uppercase tracking-wider mb-2 dark:text-white">AI Mentorship</h3>
                  <p className="text-lg leading-relaxed text-gray-700 dark:text-stone-300">
                    Your personal portfolio manager, available 24/7 to answer questions and validate theses.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/dashboard" className="px-8 py-4 bg-black dark:bg-green-600 text-white text-lg font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-green-700 transition-colors flex items-center justify-center">
                Start Your Journal <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link href="/discover" className="px-8 py-4 bg-white dark:bg-stone-800 text-black dark:text-white border-2 border-black dark:border-stone-600 text-lg font-bold uppercase tracking-widest hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center justify-center">
                Explore Markets
              </Link>
            </div>
          </div>

          {/* Sidebar Columns */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="border border-black dark:border-stone-600 p-1 text-center">
              <div className="border border-black dark:border-stone-600 p-6 bg-stone-50 dark:bg-stone-800">
                <h3 className="text-4xl font-bold mb-2 dark:text-white">35%</h3>
                <p className="text-sm uppercase tracking-widest text-gray-500 dark:text-stone-400">Average User Alpha</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold uppercase tracking-widest border-b-2 border-black dark:border-stone-600 pb-2 dark:text-white">Why FundThesis?</h3>

              <div className="group cursor-pointer">
                <h4 className="text-xl font-bold mb-1 group-hover:underline dark:text-white">Environmental Impact</h4>
                <p className="text-gray-600 dark:text-stone-400 leading-relaxed">We track the ESG scores that matter, helping you build a sustainable future.</p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xl font-bold mb-1 group-hover:underline dark:text-white">Global Community</h4>
                <p className="text-gray-600 dark:text-stone-400 leading-relaxed">Join thousands of disciplined investors sharing wisdom, not hype.</p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xl font-bold mb-1 group-hover:underline dark:text-white">Institutional Tools</h4>
                <p className="text-gray-600 dark:text-stone-400 leading-relaxed">Access the same data feeds used by Wall Street, democratized for you.</p>
              </div>
            </div>

            <div className="mt-auto bg-black dark:bg-green-700 text-white p-6 text-center">
              <p className="font-serif italic text-lg mb-4">&quot;The best investment you can make is in yourself.&quot;</p>
              <Link href="/learn" className="inline-block border-b border-white hover:opacity-80">
                Visit Learning Corner &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Footer Features Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 border-r border-black/10 dark:border-stone-700 last:border-0">
            <Globe className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-stone-500" />
            <h4 className="font-bold uppercase tracking-widest text-sm dark:text-stone-300">Global Data</h4>
          </div>
          <div className="p-4 border-r border-black/10 dark:border-stone-700 last:border-0">
            <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-stone-500" />
            <h4 className="font-bold uppercase tracking-widest text-sm dark:text-stone-300">Secure & Private</h4>
          </div>
          <div className="p-4 border-r border-black/10 dark:border-stone-700 last:border-0">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-stone-500" />
            <h4 className="font-bold uppercase tracking-widest text-sm dark:text-stone-300">Community Led</h4>
          </div>
          <div className="p-4">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-stone-500" />
            <h4 className="font-bold uppercase tracking-widest text-sm dark:text-stone-300">Deep Analytics</h4>
          </div>
        </section>

      </main>
    </div>
  );
}
