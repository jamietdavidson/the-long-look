import {SpoilsPageHero, SpoilsPageContent} from '~/components/spoils/SpoilsPageHero';

export const meta = () => [{title: 'Shipping & Returns | House of Spoils'}];

export default function ShippingPage() {
  return (
    <>
      <SpoilsPageHero title="Shipping & Returns" />
      <SpoilsPageContent>
        <section className="space-y-4 mb-10">
          <h2 className="text-[14px] uppercase tracking-[0.2em] font-semibold">Shipping</h2>
          <p className="text-[12px] text-neutral-600 leading-relaxed">
            All orders ship within 5–7 business days. Free shipping on orders over $200.
          </p>
        </section>
        <section className="space-y-4">
          <h2 className="text-[14px] uppercase tracking-[0.2em] font-semibold">Returns</h2>
          <p className="text-[12px] text-neutral-600 leading-relaxed">
            Returns accepted within 30 days of delivery. Contact hello@houseofspoils.com to initiate a return.
          </p>
        </section>
      </SpoilsPageContent>
    </>
  );
}
