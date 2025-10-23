import { GalleryItem } from "./images";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type RootStackParamList = {
    Main: undefined;
    Event: { eventId: number; eventName: string };
    Person: { personId: number; personName: string; personImages: GalleryItem[] };
}