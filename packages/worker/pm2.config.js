module.exports = {
  apps: [
    {
      script: "./dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "1000M"
    },
  ],
}
