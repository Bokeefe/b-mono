import { env } from "../environment";

class FakerApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${env.api.url}:${env.api.port}`;
  }

  async getAnimals() {
    try {
      const response = await fetch(`${this.baseUrl}/api/faker/animals`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  async getAnimal(id: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/faker/animal/${id}`);
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }
}

export const fakerApiService = new FakerApiService();
