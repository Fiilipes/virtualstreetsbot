// config.js
require('dotenv').config();

module.exports = {
  TOKEN: process.env.TOKEN,
  SERVER_ID: process.env.SERVER_ID,
  PREFIX: '!', // You can make prefix configurable,
  CHANNELS: {
    UPDATE_REPORTS: {
        ID: process.env.UPDATE_REPORTS_CHANNEL_ID,
        COMMANDS: "ALL"
    },
    BAD_CAM_REPORTS: {
        ID: process.env.BAD_CAM_REPORTS_CHANNEL_ID,
        COMMANDS: "ALL"
    },
  }
};
