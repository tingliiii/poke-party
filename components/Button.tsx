import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  // Tech/Sci-fi Button Styles
  const baseStyles = "relative overflow-hidden py-3 px-6 font-display font-bold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group";
  
  // Custom clipping path style for "chamfered" corners could be added here, 
  // but using rounded-sm or rounded-lg with borders for now.
  
  const variants = {
    primary: `
        bg-poke-cyan/10 text-poke-cyan border border-poke-cyan/50
        hover:bg-poke-cyan hover:text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]
        backdrop-blur-sm rounded-lg
    `,
    secondary: `
        bg-slate-800 text-white border border-slate-600
        hover:border-white hover:bg-slate-700
        rounded-lg
    `,
    outline: `
        bg-transparent text-slate-300 border border-slate-700
        hover:border-poke-cyan hover:text-poke-cyan
        rounded-lg
    `,
    ghost: `
        bg-transparent text-slate-400 hover:text-white hover:bg-white/5
        rounded-lg
    `,
    danger: `
        bg-poke-red/10 text-poke-red border border-poke-red/50
        hover:bg-poke-red hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]
        rounded-lg
    `
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const shapeClass = "rounded-lg"; // Consistent shape

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${shapeClass} ${className}`}
      {...props}
    >
      {/* Subtle scanline effect on hover for primary/secondary */}
      {(variant === 'primary' || variant === 'danger') && (
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

export default Button;