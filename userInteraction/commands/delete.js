module.exports.run = async (client, message, args, container) => {
    const logger = container.get('logger');  // Use the container to get the logger
    const chalk = (await import('chalk')).default;

    logger.info(`${chalk.green('Successfully deleted message')} from ${chalk.green(author.username)}.`);
};

module.exports.help = {
    name: 'delete',
    description: 'Delete your report!',
};