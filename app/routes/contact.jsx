import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'Contact | The Long Look'}];

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact" />
      <PageContent>
        <p className={cn(type.body.md, 'text-neutral-600 mb-6')}>hello@thelonglook.com</p>
        <p className={cn(type.body.md, 'text-neutral-600')}>1513 Park Row, Venice CA 90291</p>
      </PageContent>
    </>
  );
}
