const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const {
  authenticate,
  requireRole,
} = require("../src/middleware/auth");

describe("Authentication and role-based access", () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = "jest-test-secret-not-for-production";
  });

  beforeEach(() => {
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
      { sub: "507f1f77bcf86cd799439011", role },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
  }

  test("rejects a request without a token", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
  });

  test("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  test("allows a valid user to access a protected route", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${tokenFor("user")}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("user");
  });

  test("denies a regular user access to an admin route", async () => {
    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${tokenFor("user")}`);

    expect(response.status).toBe(403);
  });

  test("allows an admin to access an admin route", async () => {
    const response = await request(app)
      .get("/admin")
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Admin access granted");
  });
});
