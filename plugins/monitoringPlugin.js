const processMessageContent = require('../functions/processMessageContent');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, deleteDoc, collection } = require('firebase/firestore');
const dotenv = require('dotenv');
dotenv.config();

class MonitoringPlugin {
    constructor(container) {
        this.client = container.get('client');
        this.logger = container.get('logger');
        this.container = container;
        this.chalk = null;
        this.firestore = null;
        this.PREFIX = container.get('config').PREFIX;
        this.CHANNELS = container.get('config').CHANNELS;
    }

    async init() {
        this.chalk = (await import('chalk')).default;

        // Initialize Firebase
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID,
            measurementId: process.env.FIREBASE_MEASUREMENT_ID,
        };
        const app = initializeApp(firebaseConfig);
        this.firestore = getFirestore(app);

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
                    if (message.content.startsWith('[error]')) break;
                    const processedMessageContent = await processMessageContent(false, messageContent, messageChannel, messageAuthor, this.logger, this.chalk);
                    if (!processedMessageContent?.valid) break;
                    console.log("continue")

                    const {address, discordEmojiFlag, permalink, date, tagsInput, descriptionInput } = processedMessageContent;
                    // Log new database entry
                    this.logger.info(`${this.chalk.cyan('Adding new database data for')} ${this.chalk.yellow(message.channel.id === this.CHANNELS.UPDATE_REPORTS.ID ? 'UPDATE REPORTS' : 'BAD CAM REPORTS')} ${this.chalk.cyan('by')} ${this.chalk.green(message.author.username)}: ${message.content}`);

                    // Add the data to Firestore
                    await setDoc(doc(collection(this.firestore, 'reports')), {
                        address: address,
                        url: permalink,
                    });
                    break;
                }
            }
        } else {
            // COMMAND HANDLING
            if (message.author.bot) return;
            console.log("Command detected");

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
                    await command.run({
                        client: this.client,
                        container: this.container,
                        message: message
                    });
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
                    message.channel.createMessage('[error] There was an error executing that command.').then((msg) => setTimeout(() => msg.delete().catch(console.error), 5000));
                }
            }
        }
    }

    async handleMessageUpdate(
        newMessage, // The new message object
        oldMessage // The old message object
    ) {
        const { channel, content: newContent, author } = newMessage;

        if (!newMessage || !oldMessage || newMessage.content === oldMessage.content) return;
        switch (channel.id) {
            case this.CHANNELS.UPDATE_REPORTS.ID:
            case this.CHANNELS.BAD_CAM_REPORTS.ID: {
                const oldContent = oldMessage ? oldMessage.content : '[No cached content]';

                this.logger.info(
                    `${this.chalk.blue('Message edited in')} ${this.chalk.yellow(channel.id === this.CHANNELS.UPDATE_REPORTS.ID ? 'UPDATE REPORTS' : 'BAD CAM REPORTS')} ${this.chalk.blue('by')} ${this.chalk.green(author.username)}: ${this.chalk.gray(oldContent)} -> ${this.chalk.green(newContent)}`
                );

                const processedMessageContent = await processMessageContent(false, newContent, channel, author, this.logger, this.chalk);
                if (!processedMessageContent?.valid) break;

                const {address, permalink } = processedMessageContent;

                try {
                    // Update the data in Firestore
                    const reportRef = doc(collection(this.firestore, 'reports'), oldMessage.id);
                    await updateDoc(reportRef, {
                        address: address,
                        url: permalink,
                    });
                } catch (error) {
                    this.logger.error(`Failed to update report in the database: ${error.message}`);
                }
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

                try {
                    // Delete the data from Firestore
                    const reportRef = doc(collection(this.firestore, 'reports'), message.id);
                    await deleteDoc(reportRef);
                } catch (error) {
                    this.logger.error(`Failed to delete report from the database: ${error.message}`);
                }
                break;
            }
        }
    }

}

module.exports = MonitoringPlugin;
