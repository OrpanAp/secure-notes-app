
const express = require("express");
const request = require("supertest");

const loginRateLimiter = require("../src/middleware/loginRateLimiter");

describe("Login rate limiting", () => {
  let app;

  beforeEach(() => {
    app = express();

    app.use(express.json());

    app.post("/login", loginRateLimiter, (req, res) => {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    });
  });

  test("allows requests within the configured limit", async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await request(app)
        .post("/login")
        .send({
          email: "test@example.com",
          password: "wrong-password",
        });

      expect(response.status).toBe(401);
    }
  });

  test("blocks requests after the limit is exceeded", async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post("/login")
        .send({
          email: "test@example.com",
          password: "wrong-password",
        });
    }

    const response = await request(app)
      .post("/login")
      .send({
        email: "test@example.com",
        password: "wrong-password",
      });

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/too many login attempts/i);
  });

  test("includes standard rate-limit headers", async () => {
    const response = await request(app).post("/login").send({
      email: "test@example.com",
      password: "wrong-password",
    });

    expect(response.headers["ratelimit-limit"]).toBeDefined();
  });
});
