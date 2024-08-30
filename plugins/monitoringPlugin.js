const processMessageContent = require('../functions/processMessageContent');

class MonitoringPlugin {
    constructor(container) {
        this.client = container.get('client');
        this.logger = container.get('logger');
        this.container = container;
        this.chalk = null;
        this.PREFIX = container.get('config').PREFIX;
        this.CHANNELS = container.get('config').CHANNELS;
    }

    async init() {
        this.chalk = (await import('chalk')).default;
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
                `${this.chalk.cyan('New message in')} ${this.chalk.yellow(this.monitoredChannelId)} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`
            );
        }

        // NORMAL MESSAGE
        if (!message.content.startsWith(this.PREFIX)) {
            console.log(this.CHANNELS)
            switch (message.channel.id) {
                case this.CHANNELS.UPDATE_REPORTS.ID: {
                    const { valid, address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = await processMessageContent(false,messageContent, messageChannel, messageAuthor,this.logger,this.chalk)
                    if (!valid) break;

                    // say that you are adding new database data for UPDATE REPORTS
                    this.logger.info(`${this.chalk.cyan('Adding new database data for')} ${this.chalk.yellow('UPDATE REPORTS')} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`);
                    console.log(address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput)
                    break;
                }
                case this.CHANNELS.BAD_CAM_REPORTS.ID: {
                    const { valid, address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = await processMessageContent(false,messageContent, messageChannel, messageAuthor,this.logger,this.chalk)
                    if (!valid) break;

                    // say that you are adding new database data for BAD CAM REPORTS
                    this.logger.info(`${this.chalk.cyan('Adding new database data for')} ${this.chalk.yellow('BAD CAM REPORTS')} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`);
                    console.log(address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput)
                    break;
                }
            }
            if (message.author.bot) {


            }
        }
        // PREFIX
        else {
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
        if (newMessage.channel.id === this.monitoredChannelId) {
            const oldContent = oldMessage ? oldMessage.content : '[No cached content]';
            const newContent = newMessage.content || '[No new content]';

            this.logger.info(
                `${this.chalk.blue('Message edited in')} ${this.chalk.yellow(this.monitoredChannelId)} ${this.chalk.blue('by')} ${this.chalk.green(newMessage.author.username)}: ${this.chalk.gray(oldContent)} -> ${this.chalk.green(newContent)}`
            );
        }
    }

    async handleMessageDelete(message) {
        if (message.channel.id === this.monitoredChannelId) {
            this.logger.info(
                `${this.chalk.red('Message deleted in')} ${this.chalk.yellow(this.monitoredChannelId)} ${this.chalk.red('by')} ${this.chalk.green(message.author.username)}: ${message.content}`
            );
        }
    }
}

module.exports = MonitoringPlugin;
