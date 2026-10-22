const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));

const User = require("../src/models/User");
const {
  authenticate,
  requireRole,
} = require("../src/middleware/auth");

describe("Authentication and role-based access", () => {
  let app;

  const userId = "507f1f77bcf86cd799439011";

  beforeAll(() => {
    process.env.JWT_SECRET = "jest-test-secret-not-for-production";
  });

  beforeEach(() => {
    User.findById.mockReset();

    app = express();

    app.get("/protected", authenticate, (req, res) => {
      res.json({ success: true, user: req.user });
    });

    app.get(
      "/admin",
      authenticate,
      requireRole("admin"),
      (req, res) => {
        res.json({ success: true, message: "Admin access granted" });
      }
    );
  });

  function tokenFor(role) {
    return jwt.sign(
      { sub: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
  }

  function mockDatabaseUser(role) {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(
          role ? { _id: userId, role } : null
        ),
      }),
    });
  }

  test("rejects a request without a token", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("allows a valid user with a matching database role", async () => {
    mockDatabaseUser("user");

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${tokenFor("user")}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("user");
    expect(User.findById).toHaveBeenCalledWith(userId);
  });

  test("denies a regular user access to an admin route", async () => {
    mockDatabaseUser("user");

    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${tokenFor("user")}`);

    expect(response.status).toBe(403);
  });

  test("allows an admin with a matching database role", async () => {
    mockDatabaseUser("admin");

    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Admin access granted");
  });

  test("rejects an old admin token after the user is demoted", async () => {
    mockDatabaseUser("user");

    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Authentication token is no longer valid"
    );
  });

  test("rejects a token when its user no longer exists", async () => {
    mockDatabaseUser(null);

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${tokenFor("user")}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Authentication token is no longer valid"
    );
  });
});
