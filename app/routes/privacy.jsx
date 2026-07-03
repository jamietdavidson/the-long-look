import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'Privacy Policy | The Long Look'}];

export default function PrivacyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" />
      <PageContent>
        <p className={cn(type.body.md, 'text-neutral-600')}>
          We collect information you provide when placing an order, including name, email, and shipping address.
          We use Shopify to power our store and process payments securely.
        </p>
      </PageContent>
    </>
  );
}
