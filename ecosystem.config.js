module.exports = {
    apps: [{
      name: "sigma-api",
      script: "./dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        ENABLE_CHAT_WORKER: "false" 
      },
      env_primary: {
        ENABLE_CHAT_WORKER: "true" 
      }
    }]
  }