export type Eventt = {
    id: number;
    name: string;
    images: string[];
}

export type EventResponse = {
    events: Eventt[];
}