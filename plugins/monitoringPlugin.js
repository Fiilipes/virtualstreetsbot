const processMessageContent = require('../functions/processMessageContent');
const { PrismaClient } = require('@prisma/client');

class MonitoringPlugin {
    constructor(container) {
        this.client = container.get('client');
        this.logger = container.get('logger');
        this.container = container;
        this.chalk = null;
        this.prisma = null;
        this.PREFIX = container.get('config').PREFIX;
        this.CHANNELS = container.get('config').CHANNELS;
    }

    async init() {
        this.chalk = (await import('chalk')).default;
        this.prisma = new PrismaClient();
        this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        this.client.on('messageUpdate', this.handleMessageUpdate.bind(this));
        this.client.on('messageDelete', this.handleMessageDelete.bind(this));
    }

    async handleMessageCreate(message) {
        const messageAuthor = message.author;
        const messageContent = message.content;
        const messageChannel = message.channel;

        if (Object.values(this.CHANNELS).some(channel => channel.ID === messageChannel.id)) {
            this.logger.info(
                `${this.chalk.cyan('New message in')} ${this.chalk.yellow(messageChannel.id)} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`
            );
        }

        // NORMAL MESSAGE
        if (!message.content.startsWith(this.PREFIX)) {
            switch (message.channel.id) {
                case this.CHANNELS.UPDATE_REPORTS.ID:
                case this.CHANNELS.BAD_CAM_REPORTS.ID: {
                    const { valid, address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = await processMessageContent(false, messageContent, messageChannel, messageAuthor, this.logger, this.chalk);
                    if (!valid) break;

                    // Log new database entry
                    this.logger.info(`${this.chalk.cyan('Adding new database data for')} ${this.chalk.yellow(message.channel.id === this.CHANNELS.UPDATE_REPORTS.ID ? 'UPDATE REPORTS' : 'BAD CAM REPORTS')} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`);

                    // Add the data to the database
                    await this.prisma.report.create({
                        data: {
                            address: address,
                            url: permalink,
                        },
                    });
                    break;
                }
            }
        } else {
            // COMMAND HANDLING
            if (message.author.bot) return;

            const args = message.content.slice(this.PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            let command = this.client.commandCache.get(commandName);

            if (!command) {
                command = this.client.commands.get(commandName);
                if (command) this.client.commandCache.set(commandName, command);
            }

            if (command) {
                const startTime = Date.now(); // Record the start time
                try {
                    await command.run(this.client, message, args, this.container);
                    const endTime = Date.now(); // Record the end time
                    const executionTime = endTime - startTime; // Calculate the execution time in milliseconds
                    this.logger.info(
                        `${this.chalk.green('Command executed successfully')} ${this.chalk.yellow(commandName)}: Took ${this.chalk.cyan(executionTime + 'ms')}`
                    );
                } catch (error) {
                    const endTime = Date.now(); // Record the end time even in case of error
                    const executionTime = endTime - startTime; // Calculate the execution time
                    this.logger.error(
                        `${this.chalk.red('Error executing command')} ${this.chalk.yellow(commandName)}: ${error.message} (Took ${this.chalk.cyan(executionTime + 'ms')})`
                    );
                    message.channel.createMessage('There was an error executing that command.').then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000));
                }
            }
        }
    }

    async handleMessageUpdate(newMessage, oldMessage) {
        const { channel, content: newContent, author } = newMessage;

        switch (channel.id) {
            case this.CHANNELS.UPDATE_REPORTS.ID:
            case this.CHANNELS.BAD_CAM_REPORTS.ID: {
                const oldContent = oldMessage ? oldMessage.content : '[No cached content]';

                this.logger.info(
                    `${this.chalk.blue('Message edited in')} ${this.chalk.yellow(channel.id === this.CHANNELS.UPDATE_REPORTS.ID ? 'UPDATE REPORTS' : 'BAD CAM REPORTS')} ${this.chalk.blue('by')} ${this.chalk.green(author.username)}: ${this.chalk.gray(oldContent)} -> ${this.chalk.green(newContent)}`
                );

                const { valid, address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = await processMessageContent(false, newContent, channel, author, this.logger, this.chalk);
                if (!valid) break;

                // Update the data in the database
                await this.prisma.report.updateMany({
                    where: { url: oldMessage.content.permalink },
                    data: {
                        address: address,
                        url: permalink,
                    },
                });
                break;
            }
        }
    }

    async handleMessageDelete(message) {
        const { channel, content, author } = message;

        switch (channel.id) {
            case this.CHANNELS.UPDATE_REPORTS.ID:
            case this.CHANNELS.BAD_CAM_REPORTS.ID: {
                this.logger.info(
                    `${this.chalk.red('Message deleted in')} ${this.chalk.yellow(channel.id === this.CHANNELS.UPDATE_REPORTS.ID ? 'UPDATE REPORTS' : 'BAD CAM REPORTS')} ${this.chalk.red('by')} ${this.chalk.green(author.username)}: ${content}`
                );

                // Delete the data from the database
                await this.prisma.report.deleteMany({
                    where: { url: content.permalink },
                });
                break;
            }
        }
    }
}

module.exports = MonitoringPlugin;
