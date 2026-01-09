"use client";
import React from 'react';
import ModNav from '@/app/lessonmodules/components/ModNav';
import Quiz from '@/app/lessonmodules/components/Quiz';
import { getQuestions } from '@/app/lessonmodules/data/moduleQuestions';
import content from './content';

// Fonts: Lato for headers, Georgia for body (fallbacks included)
const headerStyle: React.CSSProperties = { fontFamily: 'Lato, Arial, sans-serif', color: '#064e3b' };
const bodyStyle: React.CSSProperties = { fontFamily: 'Georgia, serif' };

const Module1: React.FC = () => {
  const qs = getQuestions(1);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-900">
      <ModNav moduleIndex={1} totalModules={10} title="Introduction to FundThesis" />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="bg-white dark:bg-stone-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <header className="mb-8">
              <h1 className="text-4xl font-bold mb-4 dark:text-white" style={headerStyle}>{content.title}</h1>
              <p style={bodyStyle} className="text-gray-800 dark:text-stone-300 text-lg mb-4">{content.intro}</p>
              <p style={bodyStyle} className="text-gray-700 dark:text-stone-300 text-lg italic mb-6">{content.purpose}</p>
            </header>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 dark:text-white" style={headerStyle}>What you will learn</h2>
              <ul className="space-y-2" style={bodyStyle}>
                {content.learnList.map((it, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-emerald-600 dark:text-emerald-400 mr-2">•</span>
                    <span className="dark:text-stone-300">{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            {content.sections.map((s, idx) => (
              <section key={idx} className="mb-8">
                <h3 className="text-2xl font-semibold mb-3 dark:text-white" style={headerStyle}>{s.heading}</h3>
                <div style={bodyStyle} className="text-gray-800 dark:text-stone-300 leading-relaxed space-y-4">
                  {s.body.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <div className="bg-gray-50 dark:bg-stone-700 rounded-lg p-6 mt-8">
              <h3 className="text-2xl font-semibold mb-4 dark:text-white" style={headerStyle}>Key points</h3>
              <ul className="space-y-2" style={bodyStyle}>
                {content.keyPoints.map((kp, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-emerald-600 dark:text-emerald-400 mr-2">•</span>
                    <span className="dark:text-stone-300">{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <section className="mt-8">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-semibold mb-6 dark:text-white" style={headerStyle}>Module Quiz</h3>
            <div style={bodyStyle}>
              <Quiz moduleIndex={1} questions={qs} />
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="mt-8 mb-12">
          <div className="flex justify-between items-center">
            <a 
              href="/learn" 
              className="flex items-center px-4 py-2 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
              aria-label="Back to Learning Hub"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="mr-2"
              >
                <path d="M3 9.5L12 3l9 6.5"/>
                <path d="M9 22V12h6v10"/>
              </svg>
              <span className="font-medium">Learning Hub</span>
            </a>

            <a 
              href="/lessonmodules/2" 
              className="flex items-center px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
            >
              <span className="font-medium mr-2">Next Module</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </nav>
      </main>
    </div>
  );
};

export default Module1;
