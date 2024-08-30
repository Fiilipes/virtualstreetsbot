const convertDate = require('../../functions/convertDate');
const validateAndExtractMessage = require('../../functions/validateAndExtractMessage');
const gmapsUrltoData = require('../../functions/gmapsUrltoData');
const retryOperation = require('../../functions/retryOperation');
const processMessageContent = require('../../functions/processMessageContent');

module.exports.run = async (client, message, args, container) => {
  const logger = container.get('logger');  // Use the container to get the logger
  const chalk = (await import('chalk')).default;
  const fetch = (await import('node-fetch')).default;
  const channel = message.channel;
  const author = message.author;
  const messageContent = message.content;

  // Process attachments if present
  const attachments = message.attachments.map(async (attachment) => {
    const response = await fetch(attachment.proxy_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      file: buffer,
      name: attachment.filename,
    };
  });

  const attachmentFiles = await Promise.all(attachments);
  // Log initial message receipt
  logger.info(`${chalk.cyan('Processing message from')} ${chalk.green(author.username)}: ${chalk.gray(messageContent)}`);

  // Delete the original message
  await message.delete();

  const { address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = await processMessageContent(true,messageContent,channel,author,logger,chalk)

  // Create and send the final message with attachments
  await channel.createMessage({
    content: `${discordEmojiFlag}${tagsInput ? ' ' + tagsInput : ''} ${convertDate(date)} in ${address}  •  [Location link](<${permalink}>) by ${author.mention}${descriptionInput ? '  •  ' + descriptionInput : ''}`,
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
};