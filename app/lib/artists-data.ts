import { Product } from "./types";

export interface Artist {
  name: string;
  handle: string;
  birthYear: number;
  location: string;
  bio: string;
  portrait: string;
  instagramHandle: string;
  works: Product[];
}

export const artists: Artist[] = [
  {
    name: "Brecht Van't Hof",
    handle: "brecht-vant-hof",
    birthYear: 1992,
    location: "United States",
    bio: "Brecht is a LA-based lifestyle commercial photographer and director known for capturing candid moments through authentic connections with his subjects. His easy-going attitude and knack for seamlessly creating comfort in any environment help produce compelling visual stories. A California native and lifelong adventurer, Brecht's passion for surfing and exploration fuels his dynamic, ever-evolving creative vision.",
    portrait: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    instagramHandle: "@brechtvanthof",
    works: [
      {
        id: "a1",
        title: "Whitewash",
        handle: "whitewash",
        description: "Ocean spray captured in golden light",
        priceRange: { minVariantPrice: { amount: "165", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", altText: "Whitewash", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "va1", title: "24x36", availableForSale: true, price: { amount: "165", currencyCode: "USD" } } }] },
      },
      {
        id: "a2",
        title: "Float Oasis",
        handle: "float-oasis",
        description: "Poolside serenity from above",
        priceRange: { minVariantPrice: { amount: "165", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&q=80", altText: "Float Oasis", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "va2", title: "24x36", availableForSale: true, price: { amount: "165", currencyCode: "USD" } } }] },
      },
      {
        id: "a3",
        title: "Secret Palm",
        handle: "secret-palm",
        description: "Hidden tropical paradise",
        priceRange: { minVariantPrice: { amount: "165", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", altText: "Secret Palm", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "va3", title: "24x36", availableForSale: true, price: { amount: "165", currencyCode: "USD" } } }] },
      },
      {
        id: "a4",
        title: "Los Gigantes",
        handle: "los-gigantes",
        description: "Towering cliffs meet endless ocean",
        priceRange: { minVariantPrice: { amount: "165", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=800&q=80", altText: "Los Gigantes", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "va4", title: "24x36", availableForSale: true, price: { amount: "165", currencyCode: "USD" } } }] },
      },
    ],
  },
  {
    name: "Davide de Martis",
    handle: "davide-de-martis",
    birthYear: 1988,
    location: "Italy",
    bio: "Davide is an Italian photographer whose work celebrates the Mediterranean lifestyle — sun-drenched coastlines, vintage architecture, and the effortless elegance of southern European culture. Based between Positano and Milan, his lens transforms everyday moments along the Amalfi Coast into timeless works of art.",
    portrait: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    instagramHandle: "@davidedemartis",
    works: [
      {
        id: "b1",
        title: "Fontelina",
        handle: "fontelina",
        description: "The iconic Capri beach club from above",
        priceRange: { minVariantPrice: { amount: "195", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1515266591878-f93e32bc5937?w=800&q=80", altText: "Fontelina", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vb1", title: "24x36", availableForSale: true, price: { amount: "195", currencyCode: "USD" } } }] },
      },
      {
        id: "b2",
        title: "Positano Sunset",
        handle: "positano-sunset",
        description: "Golden hour over the cliffside village",
        priceRange: { minVariantPrice: { amount: "195", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1414609245224-afa02bfb3fda?w=800&q=80", altText: "Positano Sunset", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vb2", title: "24x36", availableForSale: true, price: { amount: "195", currencyCode: "USD" } } }] },
      },
      {
        id: "b3",
        title: "Amalfi Blue",
        handle: "amalfi-blue",
        description: "The turquoise waters of the Italian coast",
        priceRange: { minVariantPrice: { amount: "195", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&q=80", altText: "Amalfi Blue", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vb3", title: "24x36", availableForSale: true, price: { amount: "195", currencyCode: "USD" } } }] },
      },
    ],
  },
  {
    name: "Alex Lau",
    handle: "alex-lau",
    birthYear: 1995,
    location: "Australia",
    bio: "Alex is a Sydney-based aerial and ocean photographer who captures the Australian coastline from perspectives most never see. His drone work reveals the abstract beauty of shorelines, the patterns of swimmers, and the raw power of waves — transforming the familiar into something extraordinary.",
    portrait: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
    instagramHandle: "@alexlau",
    works: [
      {
        id: "c1",
        title: "Bondi Aerial",
        handle: "bondi-aerial",
        description: "The iconic beach from 500 feet",
        priceRange: { minVariantPrice: { amount: "185", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80", altText: "Bondi Aerial", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vc1", title: "24x36", availableForSale: true, price: { amount: "185", currencyCode: "USD" } } }] },
      },
      {
        id: "c2",
        title: "Tide Lines",
        handle: "tide-lines",
        description: "Where sand meets surf in abstract form",
        priceRange: { minVariantPrice: { amount: "185", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80", altText: "Tide Lines", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vc2", title: "24x36", availableForSale: true, price: { amount: "185", currencyCode: "USD" } } }] },
      },
    ],
  },
  {
    name: "Tommy Murch",
    handle: "tommy-murch",
    birthYear: 1990,
    location: "United States",
    bio: "Tommy is a California-born photographer with an eye for the nostalgic. His work bridges vintage Americana with contemporary coastal life — classic cars on Pacific Coast Highway, retro surf culture, and sun-bleached neighborhoods that feel both timeless and distinctly modern.",
    portrait: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&q=80",
    instagramHandle: "@tommymurch",
    works: [
      {
        id: "d1",
        title: "PCH Cruiser",
        handle: "pch-cruiser",
        description: "Vintage convertible on Pacific Coast Highway",
        priceRange: { minVariantPrice: { amount: "175", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80", altText: "PCH Cruiser", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vd1", title: "24x36", availableForSale: true, price: { amount: "175", currencyCode: "USD" } } }] },
      },
      {
        id: "d2",
        title: "Malibu Morning",
        handle: "malibu-morning",
        description: "Dawn breaking over empty waves",
        priceRange: { minVariantPrice: { amount: "175", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=800&q=80", altText: "Malibu Morning", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vd2", title: "24x36", availableForSale: true, price: { amount: "175", currencyCode: "USD" } } }] },
      },
      {
        id: "d3",
        title: "Venice Golden",
        handle: "venice-golden",
        description: "Golden hour in Venice Beach",
        priceRange: { minVariantPrice: { amount: "175", currencyCode: "USD" } },
        images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1517191434949-5e90cd67d2b6?w=800&q=80", altText: "Venice Golden", width: 800, height: 1000 } }] },
        variants: { edges: [{ node: { id: "vd3", title: "24x36", availableForSale: true, price: { amount: "175", currencyCode: "USD" } } }] },
      },
    ],
  },
];

export function getArtistByHandle(handle: string): Artist | undefined {
  return artists.find((a) => a.handle === handle);
}
