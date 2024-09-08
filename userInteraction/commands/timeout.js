const { CommandInteraction, Constants } = require('eris');

const durationMap = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
};

module.exports.run = async ({client, interaction, args, container}) => {
    const logger = container.get('logger');
    const chalk = (await import('chalk')).default;

    const member = interaction.data.options.find(opt => opt.name === 'member')?.value;
    if (!member) {
        return interaction.createMessage({
            content: 'User is not a member of this server.',
            flags: Constants.MessageFlags.EPHEMERAL,
        });
    }

    const now = Date.now();
    const length = interaction.data.options.find(opt => opt.name === 'length')?.value;
    const unit = durationMap[interaction.data.options.find(opt => opt.name === 'unit')?.value];
    const expiry = new Date(now + length * unit - 3000); // Subtract 3 seconds

    if (expiry.getTime() > now + 28 * durationMap.day) {
        return interaction.createMessage({
            content: 'Length of the timeout exceeds 28 days.',
            flags: Constants.MessageFlags.EPHEMERAL,
        });
    }

    let reason = `Moderator: ${interaction.member.user.username}`;
    const optReason = interaction.data.options.find(opt => opt.name === 'reason')?.value;
    if (optReason) {
        reason = `${optReason} | ${reason}`;
    }

    try {
        await client.editGuildMember(interaction.guildID, member, {
            communication_disabled_until: expiry.toISOString(),
            reason: reason,
        });
        await interaction.createMessage({
            content: `Member <@${member}> has been timed out until ${expiry.toLocaleString()}.`,
            flags: Constants.MessageFlags.EPHEMERAL,
        });
        logger.info(`${chalk.green('Successfully timed out member')} <@${member}> until ${expiry.toLocaleString()}.`);
    } catch (error) {
        logger.error(`Failed to timeout member: ${error.message}`);
        await interaction.createMessage({
            content: 'Failed to timeout the member.',
            flags: Constants.MessageFlags.EPHEMERAL,
        });
    }
};

module.exports.help = {
    name: 'timeout',
    description: 'Timeout a member for a specified duration.',
    options: [
        {
            type: Constants.ApplicationCommandOptionTypes.USER,
            name: 'member',
            description: 'The member to timeout',
            required: true,
        },
        {
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            name: 'length',
            description: 'The length of the timeout',
            required: true,
        },
        {
            type: Constants.ApplicationCommandOptionTypes.STRING,
            name: 'unit',
            description: 'The unit of time (minute, hour, day, week)',
            required: true,
            choices: [
                { name: 'minute', value: 'minute' },
                { name: 'hour', value: 'hour' },
                { name: 'day', value: 'day' },
                { name: 'week', value: 'week' },
            ],
        },
        {
            type: Constants.ApplicationCommandOptionTypes.STRING,
            name: 'reason',
            description: 'The reason for the timeout',
            required: false,
        },
    ],
};