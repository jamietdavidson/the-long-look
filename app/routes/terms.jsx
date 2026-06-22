import {PageHero, PageContent} from '~/components/PageHero';

export const meta = () => [{title: 'Terms of Service | The Long Look'}];

export default function TermsPage() {
  return (
    <>
      <PageHero title="Terms of Service" />
      <PageContent>
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          By using this site, you agree to our terms. All content is property of The Long Look and
          protected by copyright law.
        </p>
      </PageContent>
    </>
  );
}
