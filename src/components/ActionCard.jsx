'use client';
import Link from 'next/link';

export default function ActionCard({ title, icon, description, href }) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-2 hover:bg-white/20 hover:shadow-2xl hover:ring-white/40 backdrop-blur-md h-full flex flex-col justify-between">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-200 mb-4 text-2xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-indigo-100/70">{description}</p>
        </div>
      </div>
    </Link>
  );
}
