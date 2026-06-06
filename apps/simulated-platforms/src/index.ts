import { startSimulatedServer } from "@sea-ops/simulated-server";
import { getSimulatedServerConfig, simulatedServerConfigs } from "./server-configs.ts";

const serverFlagIndex = process.argv.findIndex((arg) => arg === "--server");
const requestedServerId = serverFlagIndex >= 0 ? process.argv[serverFlagIndex + 1] : process.env.SIMULATED_SERVER;

const configs = requestedServerId ? [getSimulatedServerConfig(requestedServerId)] : simulatedServerConfigs;

if (configs.some((config) => !config)) {
  const available = simulatedServerConfigs.map((config) => config.serverId).join(", ");
  throw new Error(`Unknown simulated server "${requestedServerId}". Available servers: ${available}`);
}

const runningServers = await Promise.all(
  configs.map(async (config) => {
    if (!config) throw new Error("Missing simulated server config");
    const running = await startSimulatedServer(config);
    console.log(`${config.displayName} listening on http://localhost:${config.port} (${config.serverId})`);
    return running;
  }),
);

const shutdown = async () => {
  await Promise.all(runningServers.map((server) => server.close()));
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
