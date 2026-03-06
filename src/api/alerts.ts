import apiClient from './client';

export interface Alert {
    id: string;
    alert_type: string;
    client_id?: string;
    message: string;
    is_read: number;
    created_at: string;
}

export interface FetchAlertsParams {
    page?: number;
    page_size?: number;
    is_read?: boolean;
    alert_type?: string;
}

export interface AlertsResponse {
    data: Alert[];
    total: number;
    page: number;
    page_size: number;
}

export const alertsApi = {
    getAlerts: async (params?: FetchAlertsParams): Promise<AlertsResponse> => {
        const { data } = await apiClient.get<AlertsResponse>('/api/v1/alerts', { params });
        return data;
    },
    markAsRead: async (id: string) => {
        const { data } = await apiClient.put(`/api/v1/alerts/${id}/read`);
        return data;
    },
    markAllAsRead: async () => {
        const { data } = await apiClient.put('/api/v1/alerts/read-all');
        return data;
    },
    clearAlerts: async () => {
        const { data } = await apiClient.delete('/api/v1/alerts');
        return data;
    },
    deleteAlert: async (id: string) => {
        const { data } = await apiClient.delete(`/api/v1/alerts/${id}`);
        return data;
    },
};
