import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {printsPath} from '~/lib/paths';

const heroImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80',
  'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1920&q=80',
];

export function Hero() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {heroImages.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{opacity: index === currentImage ? 1 : 0}}
        >
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{backgroundImage: `url(${src})`}}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-6">
        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-white/80 mb-4">
          The Art of Living
        </p>
        <h2 className="text-[22px] md:text-[32px] lg:text-[40px] font-light leading-tight max-w-3xl">
          ready-to-hang photography from the world&apos;s top artists
        </h2>
        <Link
          to={printsPath()}
          className="mt-10 inline-block border border-white/60 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-neutral-900 transition-all duration-300"
        >
          Shop Collection
        </Link>
      </div>
    </section>
  );
}
