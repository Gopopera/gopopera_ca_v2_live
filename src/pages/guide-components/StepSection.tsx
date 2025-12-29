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
    <section id={id} className={`scroll-mt-24 py-12 md:py-16 lg:py-20 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="mb-4">
              <span className="inline-block py-1.5 px-4 rounded-full bg-[#15383c]/10 border border-[#15383c]/20 text-[#15383c] text-xs font-bold tracking-wider uppercase">
                STEP {stepNumber} / 5
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-[#15383c] mb-6">
              {title}
            </h2>
            
            <ul className="space-y-4 mb-8">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-[#e35e25] font-bold text-xl leading-none mt-1">•</span>
                  <span className="text-gray-700 text-lg leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
            
            {exampleCard && (
              <div className="mb-8">
                {exampleCard}
              </div>
            )}
          </div>
          
          {/* Right: Image */}
          <div className="relative">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full h-auto rounded-2xl shadow-xl object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

