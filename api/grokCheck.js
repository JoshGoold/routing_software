async function getGrokCheck(long, lat, available) {
    const response = await axios.post(
        url,
        {
            messages: [
                {
                    role: "system",
                    content: `You are a scheduling assistant. You receive a JSON object with 'userLocation' (longitude, latitude) and 'available' array of schedules. Each schedule has 'availTimes' and 'bookings'. Each booking has 'time', 'expectedCompletionTime', and 'location.coordinates'. Follow these rules:
                    1. Check each schedule’s 'availTimes' against its 'bookings'.
                    2. Remove any 'availTimes' slot if:
                       - It overlaps with a booking’s 'time' to 'expectedCompletionTime'.
                       - Travel time (using straight-line distance) between user location and booking coordinates doesn’t fit the schedule gaps.
                       - Slots overlap with each other or bookings after adding travel time.
                    3. Keep or add 'availTimes' slots (2 hours each) if none of the above apply.
                    4. Slots must be between 08:00:00–18:00:00 (latest start 16:00:00).
                    5. Max 3 total slots (bookings + 'availTimes') per schedule.
                    Return only the JSON object with the updated 'available' array, matching the input structure.`
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
​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​