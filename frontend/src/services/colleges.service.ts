import { apiClient } from '@/lib/api-client';
import { College } from '@/types';

export const collegesService = {
  async listActiveColleges(): Promise<College[]> {
    const response = await apiClient.get<College[]>('/colleges');
    return response.data;
  },
};
