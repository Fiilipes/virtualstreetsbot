const { execFile } = require('child_process');

module.exports = (lat, lng, heading, pitch, fov) => {
  return new Promise((resolve, reject) => {
    const command = process.env.PYTHON_PATH;
    const args = ['functions/find_panorama.py', lat, lng, heading, pitch, fov];

    execFile(command, args, (error, stdout, stderr) => {
      if (error || stderr) {
        return reject(`Error: ${error || stderr}`);
      }

      try {
        const latestPano = JSON.parse(stdout.trim());
        resolve(latestPano);
      } catch (parseError) {
        reject(`Error parsing JSON: ${parseError}`);
      }
    });
  });
};