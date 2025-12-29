import React from 'react';
import { trackEvent } from '../../lib/ga4';

interface StepNavProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * StepNav - Sticky step navigation for desktop (appears after scroll)
 */
export const StepNav: React.FC<StepNavProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { number: 1, label: 'The Model', id: 'step-1' },
    { number: 2, label: 'The Offer', id: 'step-2' },
    { number: 3, label: 'The 7-Day Plan', id: 'step-3' },
    { number: 4, label: 'Conversion', id: 'step-4' },
    { number: 5, label: 'Popera Setup', id: 'step-5' },
  ];

  const handleClick = (step: number) => {
    const element = document.getElementById(`step-${step}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onStepClick(step);
    
    trackEvent('guide_step_nav_click', {
      step_number: step,
      step_label: steps[step - 1].label,
    });
  };

  return (
    <nav className="hidden lg:block sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2">
          {steps.map((step) => (
            <button
              key={step.number}
              onClick={() => handleClick(step.number)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                currentStep === step.number
                  ? 'text-[#e35e25] border-b-2 border-[#e35e25]'
                  : 'text-gray-600 hover:text-[#15383c]'
              }`}
              aria-current={currentStep === step.number ? 'step' : undefined}
            >
              <span className="font-bold">{step.number}</span>
              <span className="ml-2">{step.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

