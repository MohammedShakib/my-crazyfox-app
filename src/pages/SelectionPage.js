import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBarChart2, FiShield, FiClock, FiCalendar } from 'react-icons/fi';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 18, stiffness: 120 } }
};

export default function SelectionPage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting();

  const formatTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-[#030712] text-white p-4 py-10">

      {/* Floating Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <motion.div
        className="relative z-10 text-center w-full max-w-2xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Card */}
        <motion.div
          variants={itemVariants}
          className="dashboard-card p-7 md:p-10 rounded-2xl"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="flex justify-center mb-7">
            <img src="/newlogo.png" alt="CrazyFox" className="h-11 w-auto" />
          </motion.div>

          {/* Greeting + Avatar */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              {greeting}, Shakib
            </h1>
          </motion.div>

          {/* Live Time + Date */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 text-gray-400 mb-9 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm">
              <FiClock className="w-3.5 h-3.5 text-blue-400" />
              {formatTime(time)}
            </span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1.5 text-sm">
              <FiCalendar className="w-3.5 h-3.5 text-blue-400" />
              {formatDate(time)}
            </span>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* CrazyFox Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              whileTap={{ scale: 0.98 }}
              className="glow-card-wrapper glow-blue"
            >
              <Link to="/crazyfox" className="glow-card-inner block text-left">
                <div className="flex items-start gap-3 mb-4">
                  <div className="icon-orb icon-orb-blue">
                    <FiBarChart2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-base leading-snug">CrazyFox Simulation</div>
                    <div className="text-xs text-gray-400 mt-1">View the 20-year financial model.</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-blue">📊 20 Years</span>
                  <span className="chip chip-gray">Financial Model</span>
                </div>
              </Link>
            </motion.div>

            {/* Rahman Trust Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.025, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              whileTap={{ scale: 0.98 }}
              className="glow-card-wrapper glow-green"
            >
              <Link to="/rahman-family-trust" className="glow-card-inner block text-left">
                <div className="flex items-start gap-3 mb-4">
                  <div className="icon-orb icon-orb-green">
                    <FiShield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-base leading-snug">Rahman Family Trust</div>
                    <div className="text-xs text-gray-400 mt-1">Access the trust's dashboard.</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip-green">🛡️ Trust</span>
                  <span className="chip chip-yellow">⚠️ WIP</span>
                </div>
              </Link>
            </motion.div>

          </div>
        </motion.div>

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-center text-gray-600 text-xs mt-6">
          CrazyFox Dashboard · Personal Use Only
        </motion.p>
      </motion.div>
    </div>
  );
}
