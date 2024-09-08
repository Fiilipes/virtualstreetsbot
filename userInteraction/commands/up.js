const Eris = require('eris');
const convertDate = require('../../functions/convertDate');
const validateAndExtractMessage = require('../../functions/validateAndExtractMessage');
const gmapsUrltoData = require('../../functions/gmapsUrltoData');
const retryOperation = require('../../functions/retryOperation');
const processMessageContent = require('../../functions/processMessageContent');

module.exports.run = async ({client,container, message = undefined,  interaction = undefined}) => {
  const logger = container.get('logger');  // Use the container to get the logger
  const chalk = (await import('chalk')).default;
  const fetch = (await import('node-fetch')).default;

  const channel = interaction ? interaction.channel : message.channel;
  const author = interaction ? interaction.author : message.author;
  const messageContent = message && message.content;

  // Process attachments if present
  const attachments = message && message.attachments.map(async (attachment) => {
    const response = await fetch(attachment.proxy_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      file: buffer,
      name: attachment.filename,
    };
  });

  const attachmentFiles = message && await Promise.all(attachments);
  // Log initial message receipt
  logger.info(`${chalk.cyan('Processing message from')} ${chalk.green(author.username)}: ${chalk.gray(messageContent)}`);

  // Delete the original message
  message && await message.delete();

  const { address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput, locationUrl } = await processMessageContent(true,messageContent,channel,author,logger,chalk)

  // Create and send the final message with attachments
  await channel.createMessage({
    content: `${discordEmojiFlag}${tagsInput ? ' ' + tagsInput : ''} ${convertDate(date)} in ${address} <${locationUrl}>${descriptionInput ? ' ' + descriptionInput : ''}\n-# Submitted by ${author.mention}`,
    allowedMentions: {
      users: false, // Disable user mentions
      roles: false, // Disable role mentions
      everyone: false, // Disable everyone/here mentions
    },
  }, attachmentFiles);

  // Log the successful processing
  logger.info(`${chalk.green('Successfully processed message')} from ${chalk.green(author.username)}.`);
};

module.exports.help = {
  name: 'up',
  description: 'Update report!',
  options: [
    {
      type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
      name: 'url',
      description:
          'The crucial one. Enter google maps url so we both know about that loc.',
      required: true,
    },
    {
      type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
      name: 'tags',
      description: 'Specify the coverage with tags. Not sure, then type "help"',
      required: true,
    },
    {
      type: Eris.Constants.ApplicationCommandOptionTypes.STRING,
      name: 'description',
      description: 'Want to add something special? You can so here!',
    },
  ],
};