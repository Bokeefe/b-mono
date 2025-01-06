import { env } from "../environment";

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${env.api.url}:${env.api.port}`;
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
