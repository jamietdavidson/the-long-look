import {PageHero, PageContent} from '~/components/PageHero';
import {PRINT_FAQ_SECTIONS} from '~/lib/print-policies';

export const meta = () => [{title: 'FAQ | The Long Look'}];

export default function FAQPage() {
  return (
    <>
      <PageHero title="Frequently Asked Questions" />
      <PageContent>
        <div className="space-y-12">
          {PRINT_FAQ_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 space-y-4"
            >
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.2em]">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-[12px] leading-relaxed text-neutral-600"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageContent>
    </>
  );
}
