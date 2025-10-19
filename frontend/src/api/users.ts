import api from "./client"


export const UserAPI = {
    searchUsers: async (query: string) => {
        const response = await api.get("/api/users/search", { params: { q: query } });
        return response;
    },
}