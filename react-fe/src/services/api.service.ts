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
      const response = await fetch(
        `${baseUrl}/api/slomo/genres/${encodeURIComponent(genre)}/tracks`,
      );
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch tracks for genre ${genre}:`, error);
      throw error;
    }
  }

  async getAlbumTracks(albumPath: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${baseUrl}/api/slomo/genres/${encodeURIComponent(albumPath)}/tracks`,
      );
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch tracks for genre ${albumPath}:`, error);
      throw error;
    }
  }

  async getClaimjumperTracks(): Promise<string[]> {
    try {
      const response = await fetch(`${baseUrl}/api/claimjumpers`);
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch tracks for claimjumpers`, error);
      throw error;
    }
  }

  async getClaimjumperTrack(name: string): Promise<string> {
    try {
      // Assuming your backend has an endpoint for individual tracks or file streaming:
      const response = await fetch(`${baseUrl}/api/claimjumpers/${name}`);
      // Or if it returns a direct URL/blob:
      return await response.url; // Adjust depending on how your backend serves the file
    } catch (error) {
      console.error(`Failed to fetch track ${name}`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
