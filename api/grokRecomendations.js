const axios = require("axios");
const apiKey = process.env.GROK_API_KEY;
const url = "https://api.x.ai/v1/chat/completions";



async function getGrokRecommendations(long, lat, bookings, schedules) {
    console.log(bookings)
    console.log(schedules)
    const response = await axios.post(
      url,
      {
        messages: [
            {
                role: "system",
                content: `You are a scheduling assistant. Given a user location and 
        existing schedules with bookings, return only a JSON object with 'available' array.
        You are to determine the available times from start to end (ex. start: 8:00:00, end: 10:00:00)
         based off the bookings of that schedule take into account travel time to optimally recommend 
         start and end times use coordinates located in the location object of the bookings. appointments 
         should be 2hours long. there should be no overlap at all—'availTimes' must not overlap with any 
         booking’s 'time' to 'expectedCompletionTime' or with other 'availTimes' slots !!
        for each day with schedule with at most two bookings you should return the whole schedule and add an 
        additional object to each schedules with availTimes listed {start: ..., end: ...} for every avail time in that day
         Max 3 bookings per van per day, 8 AM - 4 PM work
         hours. No explanations or Markdown—just the JSON data.`
            },
          {
            role: "user",
            content: JSON.stringify({
              userLocation: { long, lat },
              bookings, // Array from MongoDB
              schedules // Array from MongoDB
            })
          }
        ],
        model: "grok-2-latest",
        stream: false,
        temperature: 0
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    console.log(response.data.choices[0].message.content)
    let rawResponse = response.data.choices[0].message.content;
  if (rawResponse.startsWith("```json")) {
    rawResponse = rawResponse.substring(7); // Remove ```json (7 chars)
  }
  if (rawResponse.endsWith("```")) {
    rawResponse = rawResponse.substring(0, rawResponse.length - 3); // Remove ``` (3 chars)
  }

  return JSON.parse(rawResponse); // Should now work
  }



module.exports = getGrokRecommendations;