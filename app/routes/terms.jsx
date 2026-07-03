import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'Terms of Service | The Long Look'}];

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of Service" />
      <PageContent>
        <p className={cn(type.body.md, 'text-neutral-600')}>
          By using this site, you agree to our terms. All content is property of The Long Look and
          protected by copyright law.
        </p>
      </PageContent>
    </>
  );
}
