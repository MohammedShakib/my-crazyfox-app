import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen({ title = 'Loading data...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] overflow-hidden">
      <div className="orb orb-1" style={{ opacity: 0.2 }} />
      <div className="orb orb-2" style={{ opacity: 0.2 }} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-7"
      >
        {/* Logo */}
        <motion.img
          src="/newlogo.png"
          alt="CrazyFox"
          className="h-14 w-auto"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Animated Dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-2.5 h-2.5 rounded-full bg-blue-500"
              animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Text */}
        <p className="text-sm text-gray-500 tracking-widest uppercase">{title}</p>
      </motion.div>
    </div>
  );
}
