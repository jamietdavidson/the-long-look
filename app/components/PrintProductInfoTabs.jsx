import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {Info} from 'lucide-react';
import {Aside, useAside} from '~/components/Aside';
import {getPrintFaqSection, PRINT_FAQ_SECTIONS} from '~/lib/print-policies';
import {cn} from '~/lib/utils';
import {type as typography} from '~/lib/typography';

const TABS = PRINT_FAQ_SECTIONS.map((section) => ({
  id: section.id,
  label: section.title,
}));

/**
 * @param {{
 *   activeTab: string;
 *   onTabChange: (tab: string) => void;
 *   selectedFrame?: string | null;
 * }}
 */
function PrintProductInfoTabbedContent({
  activeTab,
  onTabChange,
  selectedFrame = null,
}) {
  const {close} = useAside();
  const section = getPrintFaqSection(activeTab);
  const unframed =
    selectedFrame &&
    (selectedFrame.toLowerCase().includes('no frame') ||
      selectedFrame.toLowerCase().includes('unframed'));

  if (!section) return null;

  const paragraphs =
    activeTab === 'shipping' && unframed
      ? [
          section.paragraphs[0],
          'Unframed prints ship rolled in a protective poster tube.',
          section.paragraphs[2],
        ]
      : section.paragraphs;

  return (
    <div className="-m-4 flex min-h-0 flex-1 flex-col-reverse md:flex-col">
      <div
        role="tablist"
        aria-label="Product information"
        className="grid shrink-0 grid-cols-3 divide-x divide-neutral-200 border-t border-neutral-200 md:border-t-0 md:border-b"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`print-info-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`print-info-panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              typography.body.md,
              'px-2 py-3 text-center leading-snug font-medium transition-colors md:px-3 md:text-body-xl',
              activeTab === tab.id
                ? 'bg-neutral-100 text-neutral-900'
                : 'bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
        <div
          role="tabpanel"
          id={`print-info-panel-${section.id}`}
          aria-labelledby={`print-info-tab-${section.id}`}
          className={cn(typography.body.lg, 'space-y-3 text-neutral-600')}
        >
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <Link
            to={`/faq#${section.id}`}
            className="inline-block text-neutral-900 underline underline-offset-2"
            onClick={close}
          >
            Read more in FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PrintProductInfoListItem() {
  const {openPrintInfo} = useAside();
  const linkClass =
    'text-neutral-900 underline underline-offset-2 transition-colors hover:text-neutral-600';

  return (
    <li className="flex items-start gap-3">
      <Info
        className="mt-0.5 size-4 shrink-0 text-neutral-400"
        strokeWidth={1.5}
        aria-hidden
      />
      <span>
        {TABS.map((tab, index) => (
          <span key={tab.id}>
            {index === 0 ? null : index === TABS.length - 1 ? ', & ' : ', '}
            <button
              type="button"
              onClick={() => openPrintInfo(tab.id)}
              className={linkClass}
            >
              {tab.label}
            </button>
          </span>
        ))}
      </span>
    </li>
  );
}

/**
 * @param {{selectedFrame?: string | null}} props
 */
export function PrintProductInfoAside({selectedFrame = null}) {
  const {type, printInfoTab} = useAside();
  const isOpen = type === 'print-info';
  const [activeTab, setActiveTab] = useState(printInfoTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(printInfoTab);
    }
  }, [isOpen, printInfoTab]);

  return (
    <Aside type="print-info" heading="Product Information">
      {isOpen ? (
        <PrintProductInfoTabbedContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedFrame={selectedFrame}
        />
      ) : null}
    </Aside>
  );
}
