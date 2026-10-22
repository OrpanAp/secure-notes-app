jest.mock("../src/models/User", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("../src/utils/generateToken", () =>
  jest.fn(() => "test-token")
);

const User = require("../src/models/User");
const { register } = require("../src/controllers/authController");

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

describe("Registration role protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findOne.mockResolvedValue(null);

    User.create.mockImplementation(async (data) => ({
      _id: "test-user-id",
      ...data,
      createdAt: new Date(),
    }));
  });

  test("does not allow public registration to create an admin", async () => {
    const req = {
      body: {
        name: "Test User",
        email: "test-role@example.com",
        password: "TestPass123!",
        role: "admin",
      },
    };

    const res = mockResponse();

    await register(req, res);

    expect(res.statusCode).toBe(201);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test-role@example.com",
        role: "user",
      })
    );
    expect(res.body.user.role).toBe("user");
  });
});
