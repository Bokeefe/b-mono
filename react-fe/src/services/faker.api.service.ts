import { baseUrl } from "../environment";

class FakerApiService {
  async getAnimals() {
    try {
      const response = await fetch(`${baseUrl}/api/faker/animals`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  async getAnimal(id: string) {
    try {
      const response = await fetch(`${baseUrl}/api/faker/animal/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }
}

export const fakerApiService = new FakerApiService();
