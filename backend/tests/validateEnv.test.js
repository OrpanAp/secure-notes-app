
const validateEnv = require("../src/config/validateEnv");

describe("Environment validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.JWT_SECRET = "a".repeat(40);
    process.env.MONGODB_URI = "mongodb://localhost:27017/secure_notes_test";
    process.env.BCRYPT_SALT_ROUNDS = "12";
    process.env.JWT_EXPIRES_IN = "1d";
    process.env.PORT = "4000";
  });

  afterEach(() => {
    for (const key of [
      "JWT_SECRET",
      "MONGODB_URI",
      "BCRYPT_SALT_ROUNDS",
      "JWT_EXPIRES_IN",
      "PORT",
    ]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  test("accepts valid configuration", () => {
    expect(() => validateEnv()).not.toThrow();
  });

  test("rejects a missing JWT secret", () => {
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow(/JWT_SECRET is required/);
  });

  test("rejects a short JWT secret", () => {
    process.env.JWT_SECRET = "too-short";

    expect(() => validateEnv()).toThrow(/at least 32 bytes/);
  });

  test("rejects a missing MongoDB URI", () => {
    delete process.env.MONGODB_URI;

    expect(() => validateEnv()).toThrow(/MONGODB_URI is required/);
  });

  test("rejects invalid bcrypt salt rounds", () => {
    process.env.BCRYPT_SALT_ROUNDS = "99";

    expect(() => validateEnv()).toThrow(/BCRYPT_SALT_ROUNDS/);
  });

  test("rejects an invalid JWT expiration", () => {
    process.env.JWT_EXPIRES_IN = "not-a-duration";

    expect(() => validateEnv()).toThrow(/JWT_EXPIRES_IN/);
  });

  test("rejects an invalid port", () => {
    process.env.PORT = "70000";

    expect(() => validateEnv()).toThrow(/PORT/);
  });
});
