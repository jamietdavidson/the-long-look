import {SpoilsPageHero, SpoilsPageContent} from '~/components/spoils/SpoilsPageHero';

export const meta = () => [{title: 'Contact | House of Spoils'}];

export default function ContactPage() {
  return (
    <>
      <SpoilsPageHero title="Contact" />
      <SpoilsPageContent>
        <p className="text-[12px] text-neutral-600 mb-6">hello@houseofspoils.com</p>
        <p className="text-[12px] text-neutral-600">1513 Park Row, Venice CA 90291</p>
      </SpoilsPageContent>
    </>
  );
}
