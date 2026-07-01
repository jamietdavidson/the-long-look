/**
 * @param {{
 *   top: { depthCqi: number; color: string } | null;
 *   left: { depthCqi: number; color: string } | null;
 * }} edges
 */
export function FramedPictureInnerEdgeShadows({edges}) {
  return (
    <>
      {edges.top ? (
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 2,
            top: 0,
            left: 0,
            right: 0,
            height: `${edges.top.depthCqi}cqi`,
            background: `linear-gradient(to bottom, ${edges.top.color}, transparent)`,
          }}
        />
      ) : null}
      {edges.left ? (
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 2,
            top: 0,
            left: 0,
            bottom: 0,
            width: `${edges.left.depthCqi}cqi`,
            background: `linear-gradient(to right, ${edges.left.color}, transparent)`,
          }}
        />
      ) : null}
    </>
  );
}
