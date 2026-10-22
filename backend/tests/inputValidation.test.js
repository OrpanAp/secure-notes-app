
const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));

const User = require("../src/models/User");
const app = require("../src/app");

describe("Request validation hardening", () => {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.JWT_SECRET = "jest-test-secret-not-for-production");

  const userId = "507f1f77bcf86cd799439011";
  const adminId = "507f1f77bcf86cd799439012";

  const token = jwt.sign(
    { sub: userId, role: "user" },
    secret,
    { expiresIn: "5m" }
  );

  const adminToken = jwt.sign(
    { sub: adminId, role: "admin" },
    secret,
    { expiresIn: "5m" }
  );

  function mockDatabaseUser(id, role) {
    User.findById.mockImplementation((requestedId) => ({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(
          requestedId === id ? { _id: id, role } : null
        ),
      }),
    }));
  }

  beforeEach(() => {
    User.findById.mockReset();
    mockDatabaseUser(userId, "user");
  });

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

  test("admin pagination rejects partially numeric query values", async () => {
    mockDatabaseUser(adminId, "admin");

    const response = await request(app)
      .get("/api/admin/users?page=2abc")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});
