const User = require("../src/models/User");

const {
  groupUsersByInterest,
  getUserPosts,
} = require("../src/controllers/adminController");

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

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Admin aggregation requirements", () => {
  test("groups users by interest with exactly one aggregate call", async () => {
    const expectedGroups = [
      {
        _id: "JavaScript",
        userCount: 2,
        users: [
          { id: "user-1", name: "Test One", email: "one@example.com" },
          { id: "user-2", name: "Test Two", email: "two@example.com" },
        ],
      },
    ];

    const aggregateSpy = jest
      .spyOn(User, "aggregate")
      .mockResolvedValue(expectedGroups);

    const findSpy = jest.spyOn(User, "find");
    const countSpy = jest.spyOn(User, "countDocuments");

    const req = { query: {}, params: {} };
    const res = mockResponse();

    await groupUsersByInterest(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(expectedGroups);
    expect(aggregateSpy).toHaveBeenCalledTimes(1);
    const pipeline = aggregateSpy.mock.calls[0][0];
    expect(pipeline.some((stage) => stage.$unwind?.$interests === "$interests")).toBe(true);
    expect(pipeline.filter((stage) => stage.$group)).toHaveLength(2);
    expect(findSpy).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });

  test("uses one aggregation pipeline with $lookup to retrieve posts", async () => {
    const userId = "507f1f77bcf86cd799439011";

    const aggregateSpy = jest
      .spyOn(User, "aggregate")
      .mockResolvedValue([
        {
          _id: userId,
          name: "Test Admin",
          email: "admin@example.com",
          role: "admin",
          posts: [
            {
              _id: "post-1",
              title: "Example post",
              content: "Example content",
            },
          ],
        },
      ]);

    const req = { params: { id: userId } };
    const res = mockResponse();

    await getUserPosts(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.posts).toHaveLength(1);
    expect(aggregateSpy).toHaveBeenCalledTimes(1);

    const pipeline = aggregateSpy.mock.calls[0][0];
    expect(pipeline.some((stage) => stage.$match?._id)).toBe(true);
    const lookupStage = pipeline.find((stage) => stage.$lookup);

    expect(lookupStage).toBeDefined();
    expect(lookupStage.$lookup.from).toBe("posts");
    expect(lookupStage.$lookup.foreignField).toBe("author");
  });

  test("rejects an invalid user ID before querying MongoDB", async () => {
    const aggregateSpy = jest.spyOn(User, "aggregate");

    const req = { params: { id: "not-a-valid-object-id" } };
    const res = mockResponse();

    await getUserPosts(req, res);

    expect(res.statusCode).toBe(400);
    expect(aggregateSpy).not.toHaveBeenCalled();
  });
});
