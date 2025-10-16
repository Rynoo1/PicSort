export type Eventt = {
    id: string;
    name: string;
    images: string[];
}

export type EventResponse = {
    events: Eventt[];
}