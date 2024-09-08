const Eris = require('eris');
const dotenv = require('dotenv');
const pino = require('pino');
const { ServiceContainer } = require('./services/container');
const { PluginManager } = require('./services/pluginManager');
const { EventEmitter } = require('events');
const util = require('util');

// Load environment variables
dotenv.config();

// Initialize logger
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: true,
      ignore: 'pid,hostname',
    },
  },
});

// Bot Configuration
const { TOKEN, SERVER_ID, PREFIX, CHANNELS } = require('./config');

// Dependency Injection Container
const container = new ServiceContainer();
container.register('logger', logger);
container.register('config', { TOKEN, SERVER_ID, PREFIX, CHANNELS });

// Event Emitter for custom events
const eventEmitter = new EventEmitter();
container.register('eventEmitter', eventEmitter);

// Initialize the bot client
const client = new Eris.Client(TOKEN, { intents: ['all'] });
container.register('client', client);

client.commandCache = new Map();

(async () => {
  const QuickLRU = (await import('quick-lru')).default;
  const chalk = (await import('chalk')).default;

  client.commandCache = new QuickLRU({ maxSize: 100 });

  client.on('ready', async () => {
    client.editStatus('online', {
      name: `Coverage reports`,
      type: Eris.Constants.ActivityTypes.LISTENING,
    });
    logger.info('Bot is ready.');

    // Load and initialize plugins
    const pluginManager = new PluginManager(container);
    await pluginManager.loadPlugins('plugins');
    logger.info('Plugins initialized.');
  });

  client.on('warn', (message) => logger.warn(`${chalk.yellow('Rate limit warning:')} ${message}`));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`${chalk.red('Unhandled Rejection at:')} ${chalk.yellow(util.inspect(promise, { depth: 5 }))} ${chalk.red('reason:')} ${reason instanceof Error ? reason.stack : reason}`);
  });
  process.on('uncaughtException', (error) => {
    logger.error(`${chalk.red('Uncaught Exception thrown:')} ${error.stack}`);
  });
  async function shutdown() {
    logger.info(chalk.red('Shutting down...'));
    await client.editStatus('dnd', { name: 'Shutting down...' });
    await client.disconnect({ reconnect: false });
    process.exit(0);
  }
  client.on('shardDisconnect', (error, id) => {
    if (error) {
      console.error(`Shard ${id} disconnected due to error: ${error.message}`);
    } else {
      console.warn(`Shard ${id} disconnected without error.`);
    }

    // Implement reconnection logic if necessary
    setTimeout(() => {
      client.connect();
    }, 5000); // Reconnect after 5 seconds
  });

  // Connect the bot
  client.connect();
})();
