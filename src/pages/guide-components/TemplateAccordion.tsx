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
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`template-${templateId}`}
      >
        <span className="font-bold text-[#15383c] text-lg">{title}</span>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      <div
        id={`template-${templateId}`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-xl p-5 mb-4 font-mono text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-[#15383c] text-white rounded-full font-medium hover:bg-[#1a4a4f] transition-colors text-sm"
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

