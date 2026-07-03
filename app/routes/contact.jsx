import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'Contact | The Long Look'}];

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact" />
      <PageContent>
        <p className={cn(type.body.md, 'mb-6 text-neutral-600')}>
          <a
            href="mailto:info@thelonglook.co"
            className="transition-colors hover:text-neutral-900"
          >
            info@thelonglook.co
          </a>
        </p>
        <p className={cn(type.body.md, 'text-neutral-600')}>Victoria, BC</p>
      </PageContent>
    </>
  );
}
