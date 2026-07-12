/** Grey wall backdrop and @container sizing context for FramedPicture. */
import {cn} from '~/lib/utils';

export const FRAMED_PICTURE_WALL = {
  default:
    '@container flex w-full items-center justify-center bg-[#ececea] px-5 py-10',
  detail:
    '@container flex h-full w-full items-center justify-center bg-[#ececea]',
  gridCard:
    '@container flex h-full w-full flex-col items-stretch bg-[#ececea] px-5 pt-10 pb-6',
  compact:
    '@container flex w-28 shrink-0 items-center justify-center bg-[#ececea] px-2 pt-3.5 pb-2.5',
  summaryStrip:
    '@container flex h-full w-full items-center justify-center bg-[#ececea] px-1.5 py-2',
};

export const FRAMED_PICTURE_IMAGE_SIZES = {
  grid: '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1600px) 33vw, 25vw',
  detail: '(max-width: 768px) 100vw, 42vw',
  compact: '112px',
};

/**
 * @param {{
 *   variant?: 'default' | 'detail' | 'gridCard' | 'compact' | 'summaryStrip';
 *   className?: string;
 *   style?: import('react').CSSProperties;
 *   containerRef?: import('react').Ref<HTMLDivElement>;
 *   children: import('react').ReactNode;
 * }}
 */
export function FramedPictureWall({
  variant = 'default',
  className = '',
  style,
  containerRef,
  children,
}) {
  return (
    <div
      ref={containerRef}
      className={cn(FRAMED_PICTURE_WALL[variant], className)}
      style={style}
    >
      {children}
    </div>
  );
}
