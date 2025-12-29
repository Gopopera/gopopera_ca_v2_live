import React, { useState } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';
import { trackEvent } from '../../lib/ga4';

interface TemplateAccordionProps {
  title: string;
  content: string;
  templateId: string;
}

/**
 * TemplateAccordion - Expandable accordion with copy-to-clipboard functionality
 */
export const TemplateAccordion: React.FC<TemplateAccordionProps> = ({ title, content, templateId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      
      // Track copy event
      trackEvent('guide_template_copy', {
        template_id: templateId,
        template_name: title,
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        trackEvent('guide_template_copy', {
          template_id: templateId,
          template_name: title,
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy text:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="border border-gray-200 md:border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm md:shadow-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 md:px-6 py-3 md:py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`template-${templateId}`}
      >
        <span className="font-bold text-[#15383c] text-base md:text-lg">{title}</span>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      <div
        id={`template-${templateId}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          <div className="bg-gray-50 rounded-xl p-3 md:p-5 mb-3 md:mb-4 font-mono text-xs md:text-sm text-gray-700 whitespace-pre-wrap leading-6 md:leading-relaxed overflow-x-auto">
            {content}
          </div>
          <button
            onClick={handleCopy}
            className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 md:py-2 bg-[#15383c] text-white rounded-full font-medium hover:bg-[#1a4a4f] transition-colors text-sm"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

