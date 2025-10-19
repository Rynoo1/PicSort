type CachedImageURL = {
    url: string;
    expirestAt: string
};

type ImageCache = Record<string, CachedImageURL>;