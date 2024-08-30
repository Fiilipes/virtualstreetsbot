const validateAndExtractMessage = require("./validateAndExtractMessage");
const retryOperation = require("./retryOperation");
const gmapsUrltoData = require("./gmapsUrltoData");
module.exports = async (sendMessageErrors=false,messageContent, channel, author, logger, chalk) => {
    const result = await validateAndExtractMessage(messageContent);
    if (!result) {
        sendMessageErrors && await channel.createMessage({
            content: `${author.mention} Please provide a Google Maps URL. [Deleting this message in 5 seconds]`,
        }).then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000));
        logger.warn(`${chalk.yellow('Invalid message')} from ${chalk.green(author.username)}: No URL found.`);
        return null;
    }

    const { url: urlInput, tags: tagsInput, description: descriptionInput } = result;

    if (!urlInput) {
        sendMessageErrors && await channel.createMessage({
            content: `${author.mention} Please provide a Google Maps URL. [Deleting this message in 5 seconds]`,
        }).then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000));
        logger.warn(`${chalk.yellow('Missing URL')} in message from ${chalk.green(author.username)}.`);
        return null;
    }

    const { valid, data: response } = await retryOperation(() => gmapsUrltoData(urlInput), 3, 1000);

    if (!valid) {
        sendMessageErrors && await channel.createMessage({
            content: `${author.mention} Please provide a valid Google Maps URL. [Deleting this message in 5 seconds]`,
        }).then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000));
        logger.warn(`${chalk.red('Invalid URL')} provided by ${chalk.green(author.username)}.`);
        return {valid:valid, ...response, tagsInput, descriptionInput};
    }

    return {valid:valid, ...response, tagsInput, descriptionInput};

};