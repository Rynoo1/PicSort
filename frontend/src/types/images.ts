type CachedImageURL = {
    url: string;
    expirestAt: string
};

export type GalleryItem = 
    | { type: 'header'}
    | { type: 'image'; id: string; url: string; expires?: string };

type ImageCache = Record<string, CachedImageURL>;