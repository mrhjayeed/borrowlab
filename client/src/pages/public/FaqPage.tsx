import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: 'Who can use BorrowLab?',
    a: 'BorrowLab is currently available to verified students, faculty members, and lab officers at United International University (UIU), Dhaka. You must register with your official university institutional email (@uiu.ac.bd).',
  },
  {
    q: 'How does virtual escrow work?',
    a: 'When you activate a rental request, the rental fee and the required security deposit are locked from your virtual wallet into an escrow account. The owner receives the rental fee upon successful handover, and your security deposit is held securely until the hardware is returned and inspected.',
  },
  {
    q: 'What happens if hardware is returned late?',
    a: 'A late penalty of 15% of the daily rental rate (minimum 50 BDT per day) is automatically assessed for each overdue 24-hour cycle. The overdue penalty is deducted from the escrow security deposit upon return.',
  },
  {
    q: 'What happens if an item is damaged or accessories are missing?',
    a: 'Upon return, the hardware owner records an inspection note with photos if damage is detected. If the borrower contests the claim, an official dispute is opened. An academic lab manager or department moderator reviews the evidence and arbitrates a fair settlement amount deducted from the held escrow deposit.',
  },
  {
    q: 'How do I top up my virtual wallet balance?',
    a: 'In this university demonstration environment, you can use the instant "Top-Up" button in your top navigation bar to simulate crediting BDT to your virtual student wallet without real payment gateway friction.',
  },
  {
    q: 'Can I list my own personal hardware?',
    a: 'Yes! Any verified student or researcher can navigate to "My Hardware" in their workspace to register equipment with photos, serial numbers, and accessories, and create an active listing with custom daily and weekly pricing.',
  },
];

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-4">
      <div className="text-center space-y-3">
        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#4F46E5] text-xs font-semibold uppercase tracking-wider">
          Support & Questions
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Everything you need to know about peer-to-peer lab hardware lending, escrow protection, and campus policies.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <Card key={idx} className="overflow-hidden border-slate-200 transition-all">
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <span className="font-semibold text-sm text-slate-900 pr-4">{faq.q}</span>
                <span className="text-slate-400 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30 pt-3">
                  {faq.a}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
