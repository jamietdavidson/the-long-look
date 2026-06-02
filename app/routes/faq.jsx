import {SpoilsPageHero, SpoilsPageContent} from '~/components/spoils/SpoilsPageHero';

export const meta = () => [{title: 'FAQ | The Long Look'}];

const faqs = [
  {q: 'How long does shipping take?', a: 'Orders ship within 5–7 business days.'},
  {q: 'What sizes are available?', a: '16x20, 20x30, 24x36, 30x40, and 40x60 inches.'},
  {q: 'What frame options do you offer?', a: 'Black, white, and natural wood frames.'},
];

export default function FAQPage() {
  return (
    <>
      <SpoilsPageHero title="Frequently Asked Questions" />
      <SpoilsPageContent>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-neutral-100 pb-6">
              <h3 className="text-[13px] font-medium mb-2">{faq.q}</h3>
              <p className="text-[12px] text-neutral-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </SpoilsPageContent>
    </>
  );
}
