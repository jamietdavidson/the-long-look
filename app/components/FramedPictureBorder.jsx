import matPaperTexture from '~/assets/mat-paper-texture.png';
import {FramedPictureInnerEdgeShadows} from '~/components/FramedPictureInnerEdgeShadows';

/**
 * @param {{
 *   computed: import('~/lib/framed-picture').FramedPictureComputed;
 *   shadows: {
 *     frame: string;
 *     matEdges: {
 *       top: { depthCqi: number; color: string } | null;
 *       left: { depthCqi: number; color: string } | null;
 *     };
 *   };
 *   children: import('react').ReactNode;
 * }}
 */
export function FramedPictureBorder({computed, shadows, children}) {
  const hasMat = computed.paddingCqi > 0;
  const isUnframed = computed.frameCqi === 0;
  const showInnerWell = hasMat && !isUnframed;

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
        ...(isUnframed
          ? {
              boxShadow: shadows.frame,
              borderRadius: '0.1cqi',
            }
          : {}),
      }}
    >
      {showInnerWell ? <FramedPictureInnerEdgeShadows edges={shadows.matEdges} /> : null}
      {showInnerWell ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `${computed.paddingCqi * 0.08}cqi solid #dfdfdf`,
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
