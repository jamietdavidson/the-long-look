import {PageHero, PageContent} from '~/components/PageHero';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

export const meta = () => [{title: 'About | The Long Look'}];

export default function AboutPage() {
  return (
    <>
      <PageHero title="The Long Look" />
      <PageContent>
        <p className={cn(type.body.lg, 'mb-12 text-center text-neutral-600')}>
          The Long Look is based on the west coast of Canada. We&apos;re drawn to fine art
          photography that captures the fun, fleeting moments of life — the kind of images
          that feel as good to live with as they are to look at.
        </p>
        <p className={cn(type.body.lg, 'mb-12 text-center text-neutral-600')}>
          We curate prints from a worldwide collective of artists. Each piece arrives framed
          and ready to hang.
        </p>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <h2 className={cn(type.title.xs, 'mb-4')}>Our Mission</h2>
            <p className={cn(type.body.md, 'text-neutral-600')}>
              We believe great photography belongs on your walls — not just in a feed. Our
              goal is to make it easy to bring thoughtful, well-made art into everyday
              spaces, from quiet landscapes to the spontaneous joy of being out in the world.
            </p>
          </div>
          <div>
            <h2 className={cn(type.title.xs, 'mb-4')}>Crafted to Last</h2>
            <p className={cn(type.body.md, 'text-neutral-600')}>
              Our premium hardwood frames are available in black, white, and natural wood.
              Each frame is hand-crafted with artist-grade, UV-protected acrylic and comes
              with easy hanging hardware.
            </p>
          </div>
        </div>
      </PageContent>
    </>
  );
}
