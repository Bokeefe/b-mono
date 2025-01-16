import { useEffect, useState } from "react";
import "./Fetch.scss";
import { fakerApiService } from "../../../services/faker.api.service";

const FetchExample = () => {
  const [animalArr, setAnimalArr] = useState<string[]>([]);
  const [imageArr, setImageArr] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fakerApiService.getAnimals().then((animals: string[]) => {
      setAnimalArr(animals);
    });
  }, [isLoading]);

  useEffect(() => {
    const fetchAnimals = async () => {
      const updatedImages: string[] = [];
      const promises = animalArr.map(async (animal) => {
        const animalData = await fakerApiService.getAnimal(animal);
        updatedImages.push(animalData.image);
      });
      await Promise.all(promises);

      if (updatedImages.length) {
        setImageArr(updatedImages);
        setIsLoading(false);
      }
    };

    fetchAnimals();
  }, [animalArr, isLoading]);

  return (
    <div className="sandbox">
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        imageArr &&
        imageArr.map((image) => (
          <img src={image} alt="animal" className="animal-image" key={image} />
        ))
      )}
    </div>
  );
};

export default FetchExample;
