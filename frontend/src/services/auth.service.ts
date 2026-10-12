import { apiClient } from '@/lib/api-client';
import { LoginResponse, UserProfile } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
  college_id?: string;
  college_code?: string;
}

export const authService = {
 
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      payload,
      {
        headers: payload.college_id
          ? { 'X-College-ID': payload.college_id }
          : {},
      }
    );

    return response.data;
  },


  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  async logout(): Promise<{ message: string; detail?: string }> {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};
