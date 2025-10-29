import { AxiosError } from "axios";

export function handleAxiosError(error: unknown): string {
    
    const axiosError = error as AxiosError;

    if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const data = axiosError.response.data as { error?: string; message?: string };
        if (data.error) return data.error;
        if (data.message) return data.message;
    }

    if (axiosError.message) {
        return axiosError.message;
    }

    return 'An unkown error occured';
}