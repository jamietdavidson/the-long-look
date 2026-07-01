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
  const junctionBorderCqi = 0.11 * computed.frameCqi;

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
      <div
        style={{
          width: '100%',
          height: '100%',
          border: "3px solid " + "#dfdfdf",
        }}
      >
        {children}
      </div>
    </div>
  );
}
