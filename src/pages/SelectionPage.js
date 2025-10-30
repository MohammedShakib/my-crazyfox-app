import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion'; 
import { FiBarChart2, FiShield } from 'react-icons/fi'; 

// --- ডাইনামিক গ্রিটিং ফাংশন ---
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

// --- অ্যানিমেশনের ভেরিয়েন্ট ---
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      damping: 15, 
      stiffness: 100,
      when: "beforeChildren", 
      staggerChildren: 0.1 
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};


export default function SelectionPage() {
  const greeting = getGreeting(); 

  return (
    <div className="flex items-center justify-center min-h-screen animated-gradient text-white p-4">
      
      <motion.div 
        className="text-center p-10 md:p-12 max-w-lg mx-auto rounded-xl shadow-2xl shadow-blue-900/20 
                   bg-white/5 backdrop-blur-lg border border-white/10"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        
        <motion.h1 variants={itemVariants} className="text-4xl font-bold mb-4 text-white">
          {greeting}, Shakib
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-lg text-gray-400 mb-10">
          Welcome to your personal dashboard.
        </motion.p>
        
        <div className="space-y-5">
          
          {/* --- পরিবর্তন ১: CrazyFox বাটনে নতুন ক্লাস যোগ করা হয়েছে --- */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            className="glow-button-wrapper" // <-- নতুন wrapper ক্লাস
          >
            <Link 
              to="/crazyfox" 
              className="glow-button-inner group" // <-- নতুন inner ক্লাস
            >
              <div className="flex items-center">
                <FiBarChart2 className="w-6 h-6 mr-4 text-blue-400" /> 
                <div>
                  <div className="font-semibold text-white">CrazyFox Simulation</div>
                  <div className="text-sm font-normal text-gray-400 mt-1">View the 20-year financial model.</div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* --- পরিবর্তন ২: Rahman Trust বাটনে নতুন ক্লাস যোগ করা হয়েছে --- */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            className="glow-button-wrapper" // <-- নতুন wrapper ক্লাস
          >
            <Link 
              to="/rahman-family-trust" 
              className="glow-button-inner group" // <-- নতুন inner ক্লাস
            >
              <div className="flex items-center">
                <FiShield className="w-6 h-6 mr-4 text-green-400" /> 
                <div>
                  <div className="font-semibold text-white">Rahman Family Trust</div>
                  <div className="text-sm font-normal text-gray-400 mt-1">Access the trust's dashboard (WIP).</div>
                </div>
              </div>
            </Link>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}