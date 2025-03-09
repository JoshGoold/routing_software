const axios = require("axios");
require("dotenv").config()
const apiKey = process.env.GROK_API_KEY;
const url = "https://api.x.ai/v1/chat/completions";


async function getGrokCheck(long, lat, available) {
    const response = await axios.post(
        url,
        {
            messages: [
                {
                    role: "system",
                    content: `You are a scheduling assistant. Given a user location (longitude, latitude) and a JSON object with an 'available' array of schedules, check each schedule’s 'availTimes' against its 'bookings'. Each booking has 'time', 'expectedCompletionTime', and 'location.coordinates'.ONLY EVER  Adjust 'availTimes' if any of these conditions are met:
                    - make sure that the times in between appointments works. there should be no errors so please respond as fast as possible. your only task is to briefly check to make sure eveyrthing good.
                    aslong as none of those conditions are met you may add avail times as you see fit
                    Return the same JSON object with 'available' array, modifying 'availTimes' as needed to fit within 08:00:00–16:00:00 (latest start 14:00:00). Max 3 total slots (bookings + 'availTimes') per schedule. No explanations or Markdown—just the JSON data.`
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