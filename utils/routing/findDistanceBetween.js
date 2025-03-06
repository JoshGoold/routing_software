async function findTimeAndDistance(origin, destination) {
    try {
      const response = await fetch(
        `https://routing-software.vercel.app/get-travel-time?origin=${origin}&destination=${destination}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const data = await response.json();
      
      if (!data.Success) {
        console.error("API Error:", data.Message);
        return { travelTime: 0, distance: 0 }; // Return fallback object
      }
  
      return { travelTime: data.travelTime, distance: data.distance };
    } catch (error) {
      console.error("Error occurred while fetching distance matrix API: ", error);
      return { travelTime: 0, distance: 0 }; // Return fallback object
    }
  }
  

module.exports = findTimeAndDistance;
