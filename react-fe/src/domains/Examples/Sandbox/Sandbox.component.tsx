import { useEffect } from "react";
function twoSum(nums: number[], target: number): number[] {
  // Create a map to store the complement and its index
  const numMap: Record<number, number> = {};

  // Iterate through the numbers array
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    // Check if the complement is already in the map
    if (complement in numMap) {
      console.log(numMap, complement, i);
      return [numMap[complement], i];
    }

    // Store the number and its index in the map
    numMap[nums[i]] = i;
  }

  // Throw an error if no two numbers sum up to target (should not happen according to the problem's guarantee)
  throw new Error("No two sum solution");
}

function Sandbox() {
  const answer = twoSum([2, 7, 11, 15], 9);

  useEffect(() => {
    console.log("Sandbox", answer);
  }, []);
  return (
    <div>THis is for doing code challenges and such. No one should see it.</div>
  );
}

export default Sandbox;
