import {SpoilsPageHero, SpoilsPageContent} from '~/components/spoils/SpoilsPageHero';

export const meta = () => [{title: 'Terms of Service | The Long Look'}];

export default function TermsPage() {
  return (
    <>
      <SpoilsPageHero title="Terms of Service" />
      <SpoilsPageContent>
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          By using this site, you agree to our terms. All content is property of The Long Look and
          protected by copyright law.
        </p>
      </SpoilsPageContent>
    </>
  );
}
