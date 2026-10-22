
require("dotenv").config();

const validateEnv = require("./config/validateEnv");

try {
  validateEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Secure Notes API running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error.message);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message);
    process.exitCode = 1;
  }
}

startServer();
