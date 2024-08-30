const fs = require('fs');

class CommandHandlerPlugin {
    constructor(container) {
        this.client = container.get('client');
        this.logger = container.get('logger');
        this.SERVER_ID = container.get('config').SERVER_ID;
        this.commandCache = this.client.commandCache;
        this.client.commands = new Map();
        this.client.userApplications = new Map();
        this.client.messageApplications = new Map();
        this.chalk = null;
    }

    async init() {
        this.chalk = (await import('chalk')).default;  // Dynamically import chalk
        await Promise.all([
            this.loadCommands('userInteraction/commands', 'CHAT_INPUT'),
            this.loadCommands('userInteraction/userApplications', 'USER'),
            this.loadCommands('userInteraction/messageApplications', 'MESSAGE'),
        ]);

        this.client.on('interactionCreate', this.handleInteraction.bind(this));
    }

    async loadCommands(directory, commandType) {
        const files = fs.readdirSync(directory).filter(f => f.endsWith('.js'));
        if (!files.length) return this.logger.info(`[${directory}] No commands found.`);

        const cmds = await this.client.getGuildCommands(this.SERVER_ID);
        const collection = this.getCollectionByType(commandType);

        const tasks = files.map(async file => {
            const command = require(`../${directory}/${file}`);
            const commandData = {
                name: command.help.name,
                type: commandType,
                description: command.help.description,
                options: command.help.options,
            };

            const existingCommand = cmds.find(c => c.name === command.help.name);
            if (!existingCommand) {
                await this.client.createGuildCommand(this.SERVER_ID, commandData);
                this.logger.info(`[${directory}] Added ${file}`);
            } else if (JSON.stringify(existingCommand) !== JSON.stringify(commandData)) {
                await this.client.editGuildCommand(this.SERVER_ID, existingCommand.id, commandData);
                this.logger.info(`[${directory}] Updated ${file}`);
            }

            collection.set(command.help.name, command);
        });

        await Promise.all(tasks);

        for (const cmd of cmds) {
            if (cmd.type === commandType && !collection.has(cmd.name)) {
                await this.client.deleteGuildCommand(this.SERVER_ID, cmd.id);
                this.logger.info(`[${directory}] Deleted ${cmd.name}`);
            }
        }
        this.logger.info(`[${directory}] Commands loaded.`);
    }

    getCollectionByType(type) {
        return {
            'CHAT_INPUT': this.client.commands,
            'USER': this.client.userApplications,
            'MESSAGE': this.client.messageApplications,
        }[type];
    }

    async handleInteraction(interaction) {
        const commandName = interaction.data.name;
        let command = this.commandCache.get(commandName);

        if (!command) {
            command = this.client.commands.get(commandName)
                || this.client.userApplications.get(commandName)
                || this.client.messageApplications.get(commandName);

            if (command) this.commandCache.set(commandName, command);
        }

        if (command) {
            try {
                await command.run(this.client, interaction);
            } catch (error) {
                this.logger.error(
                    `${this.chalk.red('Error executing command')} ${this.chalk.yellow(commandName)}: ${error.message}`
                );
                console.error(error.stack);
            }
        }
    }
}

module.exports = CommandHandlerPlugin;
