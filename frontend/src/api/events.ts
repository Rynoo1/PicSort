import api from "./client";

export const EventAPI = {
    returnAllEvents: () =>
        api.post("/api/event/all"),

    returnEventData: (eventId: number | string) =>
        api.post("/api/event/eventdata", { event_id: eventId })
}