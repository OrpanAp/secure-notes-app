
const jwt = require("jsonwebtoken");

function validateEnv() {
  const errors = [];

  const secret = process.env.JWT_SECRET;
  const mongoUri = process.env.MONGODB_URI;
  const saltRoundsText = process.env.BCRYPT_SALT_ROUNDS;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  const portText = process.env.PORT;

  if (!secret || !secret.trim()) {
    errors.push("JWT_SECRET is required");
  } else if (Buffer.byteLength(secret, "utf8") < 32) {
    errors.push("JWT_SECRET must be at least 32 bytes long");
  }

  if (!mongoUri || !mongoUri.trim()) {
    errors.push("MONGODB_URI is required");
  } else if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    errors.push("MONGODB_URI must be a valid MongoDB connection URI");
  }

  if (saltRoundsText !== undefined) {
    const rounds = Number(saltRoundsText);

    if (
      !/^\d+$/.test(saltRoundsText) ||
      !Number.isInteger(rounds) ||
      rounds < 10 ||
      rounds > 15
    ) {
      errors.push("BCRYPT_SALT_ROUNDS must be an integer from 10 to 15");
    }
  }

  try {
    // jsonwebtoken validates the supported expiration format.
    jwt.sign({ check: true }, "validation-only-secret", {
      expiresIn,
    });
  } catch {
    errors.push("JWT_EXPIRES_IN is not a valid JWT expiration value");
  }

  if (portText !== undefined) {
    const port = Number(portText);

    if (
      !/^\d+$/.test(portText) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      errors.push("PORT must be an integer from 1 to 65535");
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment configuration is invalid:\n- ${errors.join("\n- ")}`
    );
  }
}

module.exports = validateEnv;
