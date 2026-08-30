require("dotenv").config();

const net = require("node:net");

const rawPort = process.env.APP_PORT || process.env.PORT || "8000";
const PORT = Number(rawPort);
const nodeMajor = Number(process.versions.node.split(".")[0]);

function describeBindError(error) {
  if (error.code === "EADDRINUSE") {
    return `Port ${PORT} is already in use. Stop the existing process or set APP_PORT to another port.`;
  }
  return `Unable to bind the API to port ${PORT}: ${error.message}`;
}

function checkPortAvailability(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    const fail = (error) => {
      probe.close(() => reject(error));
    };

    probe.once("error", fail);
    probe.listen(port, "0.0.0.0", () => {
      probe.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

if (nodeMajor !== 22) {
  console.error(
    `Unsupported Node.js version ${process.versions.node}. VoxTrail requires Node.js 22.x; run 'nvm use' or install the version from .nvmrc.`
  );
  process.exitCode = 1;
} else if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid API port: ${rawPort}. Set APP_PORT to a value from 1 to 65535.`);
  process.exitCode = 1;
} else {
  checkPortAvailability(PORT)
    .then(() => {
      const { createApp } = require("./src/app");
      const app = createApp();
      const server = app.listen(PORT);

      server.once("listening", () => {
        console.log(`Server listening on port ${PORT}`);
      });

      server.once("error", (error) => {
        console.error(describeBindError(error));
        process.exitCode = 1;
      });
    })
    .catch((error) => {
      console.error(describeBindError(error));
      process.exitCode = 1;
    });
}
