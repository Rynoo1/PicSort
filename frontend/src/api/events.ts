import api from "./client";

export const EventAPI = {
    returnAllEvents: () =>
        api.post("/api/event/all"),

    createEvent: (eventName: string, userIds: number[]) =>
        api.post("/api/event/create", { event_name: eventName, user_ids: userIds }),

    returnEventData: (eventId: number) =>
        api.post("/api/event/eventdata", { event_id: eventId }),

    getEventMeta: (eventId: number) =>
        api.post("/api/event/eventmeta", { event_id: eventId }),

    updatePersonName: (personId: number, newName: string) =>
        api.post("/api/event/updatename", { person_id: personId, new_name: newName }),

    deletePhoto: (photoId: number) =>
        api.post("/api/image/delete", { photo_id: photoId }),

    deleteEvent: (eventId: number) =>
        api.post("/api/event/delete", { event_id: eventId }),
}