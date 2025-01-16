import { baseUrl } from "../environment";

class ApiService {
  async healthCheck() {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
