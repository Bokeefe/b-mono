import { baseUrl } from "../environment";
import type { PlantingCalendarPayload } from "./planting-calendar.types";
import type { RecipesPayload } from "./recipes.types";

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

  /**
   * Planting calendar dataset plus its expanded, ready-to-draw events.
   *
   * `year` re-dates the whole plan (see `projectYear` on the backend); the API
   * dates it in the current year when the parameter is omitted.
   */
  async getPlantingCalendar(year?: number): Promise<PlantingCalendarPayload> {
    try {
      const query = year ? `?year=${year}` : "";
      const response = await fetch(
        `${baseUrl}/api/planting-calendar${query}`,
      );
      if (!response.ok) {
        throw new Error(`Planting calendar request failed (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch the planting calendar:", error);
      throw error;
    }
  }

  /**
   * Recipe recommendations for a pantry selection.
   *
   * `have` is the list of ticked ingredient ids; the backend resolves aliases
   * and does all of the matching, so an empty list simply asks for the pantry
   * (which is how the page bootstraps its checkboxes).
   */
  async getRecipes(have: string[] = []): Promise<RecipesPayload> {
    try {
      const query = have.length
        ? `?have=${have.map((id) => encodeURIComponent(id)).join(",")}`
        : "";
      const response = await fetch(`${baseUrl}/api/recipes${query}`);
      if (!response.ok) {
        throw new Error(`Recipes request failed (${response.status})`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
