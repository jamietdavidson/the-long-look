/** Grey wall backdrop and @container sizing context for FramedPicture. */
export const FRAMED_PICTURE_WALL = {
  default:
    '@container flex w-full items-center justify-center bg-[#ececea] px-5 py-10',
  detail:
    '@container flex w-full min-h-screen shrink-0 items-center justify-center bg-[#ececea] px-5 py-10 md:w-1/2',
  gridCard:
    '@container flex h-full w-full flex-col items-stretch bg-[#ececea] px-5 pt-10 pb-6',
  compact:
    '@container flex w-28 shrink-0 items-center justify-center bg-[#ececea] px-2 pt-5 pb-3',
};

export const FRAMED_PICTURE_IMAGE_SIZES = {
  grid: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1600px) 33vw, 25vw',
  detail: '(max-width: 768px) 100vw, 50vw',
  compact: '112px',
};

/**
 * @param {{
 *   variant?: 'default' | 'detail' | 'gridCard' | 'compact';
 *   className?: string;
 *   children: import('react').ReactNode;
 * }}
 */
export function FramedPictureWall({
  variant = 'default',
  className = '',
  children,
}) {
  return (
    <div className={`${FRAMED_PICTURE_WALL[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
}
