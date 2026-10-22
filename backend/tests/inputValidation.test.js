const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../src/app");

describe("Request validation hardening", () => {
  const token = jwt.sign(
    { sub: "507f1f77bcf86cd799439011", role: "user" },
    process.env.JWT_SECRET || (process.env.JWT_SECRET = "jest-test-secret-not-for-production"),
    { expiresIn: "5m" }
  );

  test.each([
    ["/api/auth/register", "post"],
    ["/api/auth/login", "post"],
  ])("%s rejects a missing body with 400", async (path, method) => {
    const response = await request(app)[method](path);
    expect(response.status).toBe(400);
  });

  test("note creation rejects a missing body with 400", async () => {
    const response = await request(app)
      .post("/api/notes")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
  });

  test.each([
    "/api/notes?page=2abc",
    "/api/notes?page=9007199254740991&limit=100",
    "/api/notes?limit=0",
  ])("notes pagination rejects invalid query: %s", async (path) => {
    const response = await request(app)
      .get(path)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
  });
});
