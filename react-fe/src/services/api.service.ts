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

  async getSlomoGenres(): Promise<string[]> {
    try {
      const response = await fetch(`${baseUrl}/api/slomo/genres`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch genres:", error);
      throw error;
    }
  }

  async getSlomoTracks(genre: string): Promise<string[]> {
    try {
      const response = await fetch(`${baseUrl}/api/slomo/genres/${encodeURIComponent(genre)}/tracks`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch tracks for genre ${genre}:`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
