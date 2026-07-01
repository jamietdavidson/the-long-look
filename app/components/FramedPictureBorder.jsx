import matPaperTexture from '~/assets/mat-paper-texture.png';
import {FramedPictureInnerEdgeShadows} from '~/components/FramedPictureInnerEdgeShadows';

/**
 * @param {{
 *   computed: import('~/lib/framed-picture').FramedPictureComputed;
 *   shadows: {
 *     matEdges: {
 *       top: { depthCqi: number; color: string } | null;
 *       left: { depthCqi: number; color: string } | null;
 *     };
 *   };
 *   children: import('react').ReactNode;
 * }}
 */
export function FramedPictureBorder({computed, shadows, children}) {
  return (
    <div
      style={{
        position: 'relative',
        lineHeight: 1,
        padding: `${computed.paddingCqi}cqi`,
        backgroundColor: computed.colors.matFace,
        backgroundImage: `url(${matPaperTexture})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '48px 48px',
      }}
    >
      <FramedPictureInnerEdgeShadows edges={shadows.matEdges} />
      {children}
    </div>
  );
}
