'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

// Enhanced glassmorphism card with dynamic blur and depth
export default function ModernGlassCard({
  children,
  className = '',
  hover = true,
  variant = 'default',
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    default: 'bg-slate-900/60 backdrop-blur-xl border border-slate-700/50',
    indigo: 'bg-indigo-900/40 backdrop-blur-xl border border-indigo-500/30',
    emerald: 'bg-emerald-900/40 backdrop-blur-xl border border-emerald-500/30',
    rose: 'bg-rose-900/40 backdrop-blur-xl border border-rose-500/30',
    amber: 'bg-amber-900/40 backdrop-blur-xl border border-amber-500/30',
  };

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 50, y: 50 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={hover ? handleMouseMove : undefined}
      onMouseEnter={hover ? handleMouseEnter : undefined}
      onMouseLeave={hover ? handleMouseLeave : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl
        ${variants[variant] || variants.default}
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: isHovered
          ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)`
          : undefined,
      }}
      whileHover={hover ? { scale: 1.02, translateY: -4 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {/* Liquid glass effect overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isHovered
            ? `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255, 255, 255, 0.1) 0%, transparent 40%)`
            : 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Animated border gradient */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(${mousePosition.x * 3.6}deg, transparent, rgba(99, 102, 241, 0.3), transparent)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Shine effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 45%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 55%, transparent 60%)`,
            backgroundSize: '200% 200%',
            animation: 'shine 1.5s ease-in-out',
          }}
        />
      )}
    </motion.div>
  );
}

// Glass button with modern styling
export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500/50',
    secondary: 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-600/50',
    success: 'bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/50',
    danger: 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      className={`
        backdrop-blur-xl rounded-xl font-medium transition-all
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Glass input field
export function GlassInput({
  label,
  icon,
  className = '',
  ...props
}) {
  return (
    <div className="relative">
      {label && (
        <label className="block text-slate-300 text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/50
            rounded-xl px-4 py-3 text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
            transition-all
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
    </div>
  );
}

// Glass badge/tag
export function GlassBadge({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const variants = {
    default: 'bg-slate-800/60 border-slate-700/50 text-slate-300',
    indigo: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    rose: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  };

  return (
    <motion.span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
        backdrop-blur-xl border
        ${variants[variant]}
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      {...props}
    >
      {children}
    </motion.span>
  );
}

// Glass modal/dialog
export function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  ...props
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`
          relative bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50
          rounded-2xl shadow-2xl w-full ${sizes[size]}
        `}
        {...props}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50
                text-slate-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// Glass dropdown/select
export function GlassSelect({
  label,
  options,
  value,
  onChange,
  className = '',
  ...props
}) {
  return (
    <div className="relative">
      {label && (
        <label className="block text-slate-300 text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`
          w-full bg-slate-900/60 backdrop-blur-xl border border-slate-700/50
          rounded-xl px-4 py-3 text-white appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
          transition-all
          ${className}
        `}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// Glass progress bar
export function GlassProgress({
  value,
  max = 100,
  variant = 'indigo',
  className = '',
  ...props
}) {
  const variants = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`relative h-2 bg-slate-800/60 rounded-full overflow-hidden ${className}`} {...props}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`h-full ${variants[variant]} rounded-full`}
      />
    </div>
  );
}

// Glass tooltip
export function GlassTooltip({
  content,
  children,
  position = 'top',
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`
            absolute z-50 px-3 py-2 bg-slate-900/90 backdrop-blur-xl
            border border-slate-700/50 rounded-lg text-white text-sm
            whitespace-nowrap shadow-xl
            ${positions[position]}
            ${className}
          `}
        >
          {content}
        </motion.div>
      )}
    </div>
  );
}
