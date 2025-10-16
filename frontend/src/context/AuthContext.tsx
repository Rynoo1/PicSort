import React, { createContext, useContext, useState, useEffect} from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";
import { jwtDecode } from "jwt-decode";

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextProps {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>
    register: (email: string, password: string, name: string) => Promise<void>;
    loading: boolean;
}

interface JWTPayload {
    exp: number;
}

const isTokenValid = (token: string) => {
    try {
        const decoded = jwtDecode<JWTPayload>(token);
        return decoded.exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync("token");
                const storedUser = await SecureStore.getItemAsync("user");
                if (storedToken && storedUser && isTokenValid(storedToken)) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                } else {
                    await logout();
                }
            } catch (err) {
                console.error("Error loading stored auth: ", err);
            } finally {
                setLoading(false);
            }
        };
        loadStoredAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setToken(data.token);
            setUser(data.user);

            await SecureStore.setItemAsync("token", data.token);
            await SecureStore.setItemAsync("user", JSON.stringify(data.user));

        } catch (err: any) {
            console.error("Login failed: ", err.response?.data || err.message);
            throw err;
        }
    };

    const register = async (email: string, password: string, name: string) => {
        try {
            await api.post("/auth/register", { email, password, name });
            await login(email, password);
        } catch (err: any) {
            console.error("Registration failed: ", err.response?.data || err.message);
            throw err;
        }
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("user");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};