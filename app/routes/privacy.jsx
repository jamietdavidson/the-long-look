import {PageHero, PageContent} from '~/components/PageHero';

export const meta = () => [{title: 'Privacy Policy | The Long Look'}];

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" />
      <PageContent>
        <p className="text-[12px] text-neutral-600 leading-relaxed">
          We collect information you provide when placing an order, including name, email, and shipping address.
          We use Shopify to power our store and process payments securely.
        </p>
      </PageContent>
    </>
  );
}
