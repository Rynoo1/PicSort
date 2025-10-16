import { api } from "./client";


export const AuthAPI = {
    login: (email: string, password: string) =>
        api.post("/auth/login", { email, password }),

    register: (data: { email: string; password: string; username: string }) =>
        api.post("/auth/register", data),
}