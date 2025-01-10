import { useEffect, useState } from "react";
import axios from "axios";
import "../Fetch/Fetch.scss";
import { env } from "../../../environment";

const AxiosExample = () => {
  const baseURL = `${env?.api?.url}:${env?.api?.port}`;
  const [animalArr, setAnimalArr] = useState<string[]>([]);
  const [imageArr, setImageArr] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/faker/animals`);
        console.log("Fetched animals:", response.data);
        setAnimalArr(response.data);
      } catch (error) {
        console.error("Error fetching animals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnimals();
  }, [baseURL]);

  useEffect(() => {
    const fetchAnimalImages = async () => {
      const updatedImages: string[] = [];
      const promises = animalArr.map(async (animal) => {
        try {
          const response = await axios.get(
            `${baseURL}/api/faker/animal/${animal}`
          );
          updatedImages.push(response.data.image);
        } catch (error) {
          console.error(`Error fetching image for animal ${animal}:`, error);
        }
      });
      await Promise.all(promises);
      console.log("Fetched images:", updatedImages);
      setImageArr(updatedImages);
    };

    if (animalArr.length > 0) {
      fetchAnimalImages();
    }
  }, [animalArr, baseURL]);

  return (
    <div className="sandbox">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        imageArr.map((image) => (
          <img src={image} alt="animal" className="animal-image" key={image} />
        ))
      )}
    </div>
  );
};

export default AxiosExample;