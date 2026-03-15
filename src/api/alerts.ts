import apiClient from './client';

export interface Alert {
    id: string;
    alert_type: string;
    client_id?: string;
    message: string;
    is_read: number;
    created_at: string;
}

export interface AlertMute {
    alert_type: string;
    muted_until: string | null;
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
    getMutes: async (): Promise<{ data: AlertMute[] }> => {
        const { data } = await apiClient.get('/api/v1/alerts/mutes');
        return data;
    },
    upsertMute: async (alertType: string, mutedUntil?: string | null): Promise<void> => {
        await apiClient.put(`/api/v1/alerts/mutes/${encodeURIComponent(alertType)}`, {
            muted_until: mutedUntil ?? null,
        });
    },
    deleteMute: async (alertType: string): Promise<void> => {
        await apiClient.delete(`/api/v1/alerts/mutes/${encodeURIComponent(alertType)}`);
    },
};
