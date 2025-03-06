require("dotenv").config()
const apiKey = process.env.GROK_API_KEY;
const url = "https://api.x.ai/v1/chat/completions";
const axios = require("axios");

async function getGrokCheck(long, lat, available) {
    const response = await axios.post(
        url,
        {
            messages: [
                {
                    role: "system",
                    content: `You are a scheduling assistant. Given a user location (longitude, latitude) and a JSON object with an 'available' array of schedules, check each schedule’s 'availTimes' against its 'bookings'. Each booking has 'time', 'expectedCompletionTime', and 'location.coordinates'.ONLY EVER  Adjust 'availTimes' if any of these conditions are met:
                    - there is an overlap with any booking’s 'time' to 'expectedCompletionTime'.
                    - There is not enough Travel buffer time calculated via Haversine distance between the user’s longitude/latitude and each booking’s 'location.coordinates'.
                    - 'availTimes' slots (2 hours each) overlap with each other or bookings after adding travel buffers.
                    aslong as none of those conditions are met you may add avail times as you see fit
                    Return the same JSON object with 'available' array, modifying 'availTimes' as needed to fit within 08:00:00–18:00:00 (latest start 16:00:00). Max 3 total slots (bookings + 'availTimes') per schedule. No explanations or Markdown—just the JSON data.`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        userLocation: { long, lat },
                        available
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

    let rawResponse = response.data.choices[0].message.content;
    if (rawResponse.startsWith("```json")) {
        rawResponse = rawResponse.substring(7);
    }
    if (rawResponse.endsWith("```")) {
        rawResponse = rawResponse.substring(0, rawResponse.length - 3);
    }

    console.log("Grok raw response:", rawResponse);
    return JSON.parse(rawResponse);
}

module.exports = getGrokCheck;