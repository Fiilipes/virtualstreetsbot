const { get } = require("axios");

module.exports = async (lat, lng) => {
    // Construct the URL for the Nominatim API
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en-US`;

    // Set custom headers to comply with the usage policy
    const headers = {
        'User-Agent': 'VSBot/1.0 (filipes.business.yt@gmail.com)',
        'Accept-Encoding': 'gzip, compress, deflate, br'
    };

    // Make the request to the API with custom headers
    const response = await get(url, { headers });

    // Check if the request was successful
    if (response.status === 200) {
        return response.data;
    } else {
        throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }
};