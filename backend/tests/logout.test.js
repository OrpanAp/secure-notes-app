
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
  updateOne: jest.fn(),
}));

const User = require("../src/models/User");
const { authenticate } = require("../src/middleware/auth");
const { logout } = require("../src/controllers/authController");

describe("Logout and token invalidation", () => {
  let app;
  let databaseUser;

  const userId = "507f1f77bcf86cd799439011";

  beforeAll(() => {
    process.env.JWT_SECRET = "jest-test-secret-not-for-production";
  });

  beforeEach(() => {
    databaseUser = {
      _id: userId,
      role: "user",
      tokenVersion: 0,
    };

    User.findById.mockReset();
    User.updateOne.mockReset();

    User.findById.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockImplementation(async () =>
          databaseUser ? { ...databaseUser } : null
        ),
      }),
    }));

    User.updateOne.mockImplementation(async (filter) => {
      const versionMatches = filter.$or
        ? filter.$or.some((condition) => {
            if (condition.tokenVersion === 0) {
              return databaseUser?.tokenVersion === 0;
            }

            return (
              condition.tokenVersion?.$exists === false &&
              databaseUser?.tokenVersion === undefined
            );
          })
        : filter.tokenVersion === databaseUser?.tokenVersion;

      const matches =
        databaseUser !== null &&
        filter._id === userId &&
        versionMatches;

      if (matches) {
        databaseUser.tokenVersion =
          (databaseUser.tokenVersion ?? 0) + 1;
      }

      return { matchedCount: matches ? 1 : 0 };
    });

    app = express();

    app.get("/protected", authenticate, (req, res) => {
      res.status(200).json({ success: true });
    });

    app.post("/logout", authenticate, logout);
  });

  function tokenFor(tokenVersion = 0) {
    return jwt.sign(
      { sub: userId, role: "user", tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
  }

  test("logout succeeds and increments the token version", async () => {
    const response = await request(app)
      .post("/logout")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(databaseUser.tokenVersion).toBe(1);
  });

  test("rejects the old token after logout", async () => {
    const oldToken = tokenFor();

    await request(app)
      .post("/logout")
      .set("Authorization", `Bearer ${oldToken}`);

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Authentication token is no longer valid"
    );
  });

  test("rejects a repeated logout using an invalidated token", async () => {
    const oldToken = tokenFor();

    await request(app)
      .post("/logout")
      .set("Authorization", `Bearer ${oldToken}`);

    const response = await request(app)
      .post("/logout")
      .set("Authorization", `Bearer ${oldToken}`);

    expect(response.status).toBe(401);
    expect(databaseUser.tokenVersion).toBe(1);
  });

  test("rejects logout without an authentication token", async () => {
    const response = await request(app).post("/logout");

    expect(response.status).toBe(401);
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});
