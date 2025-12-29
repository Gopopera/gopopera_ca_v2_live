import React from 'react';
import { GlassCard } from './GlassCard';

interface StepSectionProps {
  stepNumber: number;
  title: string;
  bullets: string[];
  exampleCard?: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  id: string;
  bgColor?: 'white' | 'gray';
}

/**
 * StepSection - Individual step section with label, title, bullets, example card, and image
 */
export const StepSection: React.FC<StepSectionProps> = ({
  stepNumber,
  title,
  bullets,
  exampleCard,
  imageSrc,
  imageAlt,
  id,
  bgColor = 'white',
}) => {
  const bgClass = bgColor === 'white' ? 'bg-white' : 'bg-[#f2f2f2]';
  
  return (
    <section id={id} className={`scroll-mt-24 py-10 md:py-12 lg:py-16 xl:py-20 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-12 lg:items-center">
          {/* Left: Content */}
          <div className="order-1 lg:order-1">
            <div className="mb-3 md:mb-4">
              <span className="inline-block py-1 md:py-1.5 px-3 md:px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                STEP {stepNumber} / 5
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-[#15383c] mb-4 md:mb-6 leading-tight">
              {title}
            </h2>
            
            <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2.5 md:gap-3">
                  <span className="text-[#e35e25] font-bold text-base md:text-xl leading-none mt-0.5 md:mt-1">•</span>
                  <span className="text-gray-700 text-base md:text-lg leading-6 md:leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
            
            {exampleCard && (
              <div className="mb-6 md:mb-8">
                {exampleCard}
              </div>
            )}
          </div>
          
          {/* Right: Image */}
          <div className="relative w-full max-w-[520px] md:max-w-full mx-auto lg:mx-0 overflow-hidden rounded-2xl shadow-sm md:shadow-xl bg-white/0 order-2 lg:order-2">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full h-full aspect-[4/3] md:aspect-auto object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

