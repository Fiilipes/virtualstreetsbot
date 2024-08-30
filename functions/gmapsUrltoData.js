const validateGoogleMapsUrl = require('./validateGoogleMapsUrl');
const extractCoordinatesFromUrl = require('./extractCoordinatesFromUrl');
const getGeocodingData = require('./getGeocodingData');
const formatOSMAddress = require('./formatOSMAddress');
const streetviewPanoramaFunctionPython = require('./streetviewPanoramaFunctionPython');
module.exports = async (url) => {
  const validatedUrl = await validateGoogleMapsUrl(url);
  if (!validatedUrl.valid) {
    return { valid: false, response: validatedUrl.response };
  }

  const coordinates = extractCoordinatesFromUrl(validatedUrl.response);
  const { lat, lng, fov, heading, pitch } = coordinates;

  const geocodingData = await getGeocodingData(lat, lng);

  const { country_code: code } = geocodingData.address;

  const address = await formatOSMAddress(geocodingData);

  const discordEmojiFlag = `:flag_${code.toLowerCase()}:`;

  const pythonMetadata = await streetviewPanoramaFunctionPython(
    parseFloat(lat),
    parseFloat(lng),
    parseFloat(heading),
    parseFloat(pitch),
    parseFloat(fov)
  );

  return {
    valid: true,
    data: {
      lat,
      lng,
      fov,
      heading,
      pitch,
      address,
      code,
      discordEmojiFlag,
      permalink: pythonMetadata.permalink,
      date: pythonMetadata.date,
    },
  };
};
