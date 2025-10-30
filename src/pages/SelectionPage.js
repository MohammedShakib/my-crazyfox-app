import React from 'react';
import { Link } from 'react-router-dom';

export default function SelectionPage() {
  return (
    // 1. ব্যাকগ্রাউন্ডে একটি হালকা গ্রেডিয়েন্ট যোগ করা হয়েছে
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
      
      {/* 2. কার্ডটি একটু বড় করা হয়েছে এবং একটি হালকা বর্ডার ও শ্যাডো দেওয়া হয়েছে */}
      <div className="text-center p-10 md:p-12 card max-w-lg mx-auto rounded-xl shadow-2xl shadow-blue-900/20 border border-gray-700/50">
        
        {/* 3. একটি টাইটেল এবং সাব-টাইটেল যোগ করা হয়েছে */}
        <h1 className="text-4xl font-bold mb-4 text-white">Welcome</h1>
        <p className="text-lg text-gray-400 mb-10">Please select a project to view.</p>
        
        {/* 4. বাটনগুলোকে "কার্ড" স্টাইল দেওয়া হয়েছে */}
        <div className="space-y-5">
          
          <Link 
            to="/crazyfox" 
            className="block w-full p-5 text-left text-lg bg-gray-800 text-white rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-700/50 transition-all duration-300 ease-in-out group"
          >
            <div className="flex items-center">
              {/* আপনি চাইলে এখানে আইকনও যোগ করতে পারেন */}
              <div className="ml-3">
                 <div className="font-semibold text-white group-hover:text-blue-300">CrazyFox Simulation</div>
                 <div className="text-sm font-normal text-gray-400 mt-1">View the 20-year financial model.</div>
              </div>
            </div>
          </Link>

          <Link 
            to="/rahman-family-trust" 
            className="block w-full p-5 text-left text-lg bg-gray-800 text-white rounded-lg border border-gray-700 hover:border-green-500 hover:bg-gray-700/50 transition-all duration-300 ease-in-out group"
          >
            <div className="flex items-center">
              {/* আপনি চাইলে এখানে আইকনও যোগ করতে পারেন */}
              <div className="ml-3">
                <div className="font-semibold text-white group-hover:text-green-300">Rahman Family Trust</div>
                <div className="text-sm font-normal text-gray-400 mt-1">Access the trust's dashboard (WIP).</div>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}