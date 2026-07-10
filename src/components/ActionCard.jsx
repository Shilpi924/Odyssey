'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ActionCard({ title, icon, description, href, index = 0 }) {
  return (
    <Link href={href} className="group block h-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-6 shadow-xl ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-2 hover:bg-white/20 hover:shadow-2xl hover:ring-white/40 backdrop-blur-md h-full flex flex-col justify-between"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-200 mb-4 text-2xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-indigo-100/70">{description}</p>
        </div>
      </motion.div>
    </Link>
  );
}
