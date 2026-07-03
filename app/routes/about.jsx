import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'About | The Long Look'}];

export default function AboutPage() {
  return (
    <>
      <PageHero title="The Long Look" />
      <PageContent>
        <p className={cn(type.body.lg, 'text-neutral-600 text-center mb-12')}>
          The Long Look curates stunning photography prints from a worldwide collective of artists.
          Each piece arrives framed and ready to hang.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className={cn(type.title.xs, 'mb-4')}>Our Mission</h2>
            <p className={cn(type.body.md, 'text-neutral-600')}>
              Our premium hardwood frames are available in black, white and natural wood. Each frame is
              hand-crafted with artist-grade, UV-protected acrylic and comes with easy hanging hardware.
            </p>
          </div>
          <div>
            <h2 className={cn(type.title.xs, 'mb-4')}>Photography From the World&apos;s Top Artists</h2>
            <p className={cn(type.body.md, 'text-neutral-600')}>
              We collaborate with a new generation of the world&apos;s best photographers, spotlighting their
              work through thoughtful storytelling and presentation.
            </p>
          </div>
        </div>
      </PageContent>
    </>
  );
}
