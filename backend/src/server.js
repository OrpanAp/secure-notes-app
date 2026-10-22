require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Secure Notes API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message);
    process.exit(1);
  }
}

startServer();
