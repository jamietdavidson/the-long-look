import {SpoilsPageHero, SpoilsPageContent} from '~/components/spoils/SpoilsPageHero';

export const meta = () => [{title: 'Privacy Policy | The Long Look'}];

export default function PrivacyPage() {
  return (
    <>
      <SpoilsPageHero title="Privacy Policy" />
      <SpoilsPageContent>
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          We collect information you provide when placing an order, including name, email, and shipping address.
          We use Shopify to power our store and process payments securely.
        </p>
      </SpoilsPageContent>
    </>
  );
}
