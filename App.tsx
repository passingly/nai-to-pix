import React from 'react';
import Header from './components/Header';
import Converter from './components/Converter';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-3xl opacity-50"></div>
      </div>
      
      <Header />
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 z-0">
        <Converter />
      </main>
      
      <footer className="w-full py-6 text-center text-slate-600 text-sm border-t border-slate-900 bg-slate-950 z-10">
        <p>AI Prompt Syntax Converter &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;