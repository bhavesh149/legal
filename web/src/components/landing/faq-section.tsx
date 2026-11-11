'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'Is LegalAgent a replacement for a licensed attorney?',
    a: 'No. LegalAgent is an AI legal assistant designed to help you quickly understand contracts, flag atypical downside risks, and draft negotiation responses. For critical deals with major financial or legal consequences, you should always consult a licensed lawyer.',
  },
  {
    q: 'Are my uploaded legal documents private and secure?',
    a: 'Yes, 100%. We utilize Enterprise-Grade Zero Data Retention (ZDR) API endpoints. Your contract data is processed strictly in memory and is legally protected from being stored, logged, or used for AI training.',
  },
  {
    q: 'How does Local PII Anonymization work?',
    a: 'Before sending text to our AI pipeline, our local Presidio scrub engine replaces sensitive information (like personal names, deal amounts, and home addresses) with generic tokens like [PERSON_1] and [AMOUNT_1]. The original values never leave your private compute boundary.',
  },
  {
    q: 'What types of contracts work best with LegalAgent?',
    a: 'LegalAgent excels at Master Services Agreements (MSAs), Freelance Contractor Contracts, Non-Disclosure Agreements (NDAs), Influencer & Creator Sponsorships, Employment Contracts, Vendor Agreements, and Residential Rental Contracts.',
  },
  {
    q: 'Can I try the scanner before creating an account?',
    a: 'Yes! Our Free Quick Risk Scan path lets you upload a PDF without signing up to instantly receive a safety score (1-100) and top-level summary teaser.',
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#0B0D0F] relative">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#88929A]">
            Frequently Asked Questions
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F1F3F4]">
            Everything you need to know.
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#22272E] bg-[#111417] overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full py-5 px-6 text-left flex items-center justify-between text-base font-semibold text-[#F1F3F4] hover:text-[#CBA96B] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-[#88929A] shrink-0 transition-transform duration-300 ${
                    openIdx === idx ? 'rotate-180 text-[#CBA96B]' : ''
                  }`}
                />
              </button>
              {openIdx === idx && (
                <div className="px-6 pb-5 text-[#88929A] text-sm leading-relaxed border-t border-[#22272E] pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
