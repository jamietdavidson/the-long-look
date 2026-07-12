import {framedPictureCqi} from '~/lib/framed-picture';

/**
 * @param {{
 *   computed: import('~/lib/framed-picture').FramedPictureComputed;
 *   shadows: { frame: string };
 *   interactive?: boolean;
 *   hovered?: boolean;
 *   children: import('react').ReactNode;
 * }}
 */
export function FramedPictureFrame({
  computed,
  shadows,
  interactive = true,
  hovered = false,
  children,
}) {
  const junctionBorderCqi = 0.11 * computed.frameCqi;

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: 'fit-content',
        maxWidth: '100%',
        maxHeight: '100%',
        borderWidth: framedPictureCqi(computed.frameCqi),
        borderStyle: 'solid',
        borderColor: computed.colors.frameBorder,
        backgroundColor: computed.colors.frameFace,
        boxShadow: computed.frameCqi > 0 ? shadows.frame : undefined,
        borderRadius: computed.frameCqi > 0 ? framedPictureCqi(0.1) : undefined,
        ...(interactive
          ? {
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transformOrigin: 'center center',
              willChange: 'transform',
              transition: 'transform 200ms ease-out',
            }
          : {}),
      }}
    >
      <div
        style={{
          width: 'fit-content',
          lineHeight: 1,
          borderWidth: framedPictureCqi(junctionBorderCqi),
          borderStyle: 'solid',
          borderColor: computed.colors.frameMatJunction,
        }}
      >
        {children}
      </div>
    </div>
  );
}
