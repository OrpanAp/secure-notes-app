jest.mock("../src/models/Note", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

const Note = require("../src/models/Note");
const {
  getNote,
  updateNote,
  deleteNote,
} = require("../src/controllers/noteController");

const USER_B_ID = "507f1f77bcf86cd799439012";
const USER_A_NOTE_ID = "507f1f77bcf86cd799439011";

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

describe("Note ownership protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Simulate a note that belongs to User A.
    // User B's ownership-scoped query must not find it.
    Note.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    Note.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    Note.findOneAndDelete.mockResolvedValue(null);
  });

  test("another user cannot read a note", async () => {
    const req = {
      params: { id: USER_A_NOTE_ID },
      user: { id: USER_B_ID, role: "user" },
    };
    const res = mockResponse();

    await getNote(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Note not found");
    expect(Note.findOne).toHaveBeenCalledWith({
      _id: USER_A_NOTE_ID,
      owner: USER_B_ID,
    });
  });

  test("another user cannot update a note", async () => {
    const req = {
      params: { id: USER_A_NOTE_ID },
      body: { title: "Unauthorized change" },
      user: { id: USER_B_ID, role: "user" },
    };
    const res = mockResponse();

    await updateNote(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Note not found");
    expect(Note.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: USER_A_NOTE_ID,
        owner: USER_B_ID,
      },
      { $set: { title: "Unauthorized change" } },
      { new: true, runValidators: true }
    );
  });

  test("another user cannot delete a note", async () => {
    const req = {
      params: { id: USER_A_NOTE_ID },
      user: { id: USER_B_ID, role: "user" },
    };
    const res = mockResponse();

    await deleteNote(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Note not found");
    expect(Note.findOneAndDelete).toHaveBeenCalledWith({
      _id: USER_A_NOTE_ID,
      owner: USER_B_ID,
    });
  });
});
