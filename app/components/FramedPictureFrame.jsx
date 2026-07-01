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
        borderWidth: `${computed.frameCqi}cqi`,
        borderStyle: 'solid',
        borderColor: computed.colors.frameBorder,
        backgroundColor: computed.colors.frameFace,
        boxShadow: shadows.frame,
        ...(interactive
          ? {
              transform: hovered ? 'translateY(-0.25rem)' : undefined,
              willChange: 'transform',
              transition: 'transform 300ms ease-out',
            }
          : {}),
      }}
    >
      <div
        style={{
          width: 'fit-content',
          lineHeight: 1,
          borderWidth: `${junctionBorderCqi}cqi`,
          borderStyle: 'solid',
          borderColor: computed.colors.frameMatJunction,
        }}
      >
        {children}
      </div>
    </div>
  );
}
