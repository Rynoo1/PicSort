export type Eventt = {
    id: number;
    name: string;
    images: string[];
    userCount?: number;
}

export type EventResponse = {
    events: Eventt[];
}