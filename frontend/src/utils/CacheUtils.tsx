import AsyncStorage from "@react-native-async-storage/async-storage";

type CachedImageURL = {
    id: string;
    url: string;
    expiresAt: string;
};

export type CachedEventData = {
    eventId: number;
    data: any;
    updatedAt: string;
    cachedAt: string;
    expiresAt: string;
};

export const cacheKey = (eventId: number) => `event_${eventId}_cache`;

export const getCachedEvent = async (eventId: number): Promise<CachedEventData | null> => {
    try {
        const json = await AsyncStorage.getItem(cacheKey(eventId));
        return json ? JSON.parse(json) : null;
    } catch (err) {
        console.error('Error reading cache:', err);
        return null;
    }
};

export const setCachedEvent = async (eventId: number, data: CachedEventData): Promise<void> => {
    try {
        await AsyncStorage.setItem(cacheKey(eventId), JSON.stringify(data));
    } catch (err) {
        console.error('Error saving cache:', err);
    }
};

export const isCacheValid = (cache: CachedEventData): boolean => {
    const now = Date.now();
    const expiry = new Date(cache.expiresAt).getTime();
    return now < expiry;
};