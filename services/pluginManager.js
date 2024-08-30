const fs = require('fs');
const path = require('path');

class PluginManager {
  constructor(container) {
    this.container = container;
    this.plugins = [];
  }

  async loadPlugins(pluginDirectory) {
    const files = fs.readdirSync(pluginDirectory).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const PluginClass = require(`../${pluginDirectory}/${file}`);
      const pluginInstance = new PluginClass(this.container);
      await pluginInstance.init();  // Await the init method here
      console.log(`Loaded plugin: ${file}`);
    }
  }

}

module.exports = { PluginManager };
