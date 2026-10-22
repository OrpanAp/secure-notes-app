const mongoose = require("mongoose");
const User = require("../models/User");
const Note = require("../models/Note");

function getPagination(query) {
  function parsePositiveInteger(value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 10);

  if (page === null || limit === null || limit > 100) return null;

  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) return null;

  return { page, limit, skip };
}

async function listUsers(req, res) {
  const pagination = getPagination(req.query);

  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  try {
    const filter = {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role interests createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    console.error("Admin list users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve users",
    });
  }
}

async function listAllNotes(req, res) {
  const pagination = getPagination(req.query);

  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  try {
    const [notes, total] = await Promise.all([
      Note.find({})
        .populate("owner", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Note.countDocuments({}),
    ]);

    return res.json({
      success: true,
      data: notes,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    console.error("Admin list notes error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notes",
    });
  }
}

/*
 * Requirement: group users by interests with exactly one User.aggregate()
 * call and no other User collection methods in this function.
 */
async function groupUsersByInterest(req, res) {
  try {
    const groups = await User.aggregate([
      { $unwind: "$interests" },
      // Count each user at most once per interest, even if legacy data contains duplicates.
      {
        $group: {
          _id: { user: "$_id", interest: "$interests" },
          name: { $first: "$name" },
          email: { $first: "$email" },
        },
      },
      {
        $group: {
          _id: "$_id.interest",
          userCount: { $sum: 1 },
          users: {
            $push: {
              id: "$_id.user",
              name: "$name",
              email: "$email",
            },
          },
        },
      },
      { $sort: { userCount: -1, _id: 1 } },
    ]);

    return res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Admin interest aggregation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to group users by interest",
    });
  }
}


async function getUserPosts(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    // One aggregation pipeline joins the user to their posts.
    const results = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "author",
          pipeline: [
            { $sort: { createdAt: -1, _id: -1 } },
            {
              $project: {
                title: 1,
                content: 1,
                author: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: "posts",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          posts: 1,
        },
      },
    ]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error("User posts aggregation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve user posts",
    });
  }
}

module.exports = {
  listUsers,
  listAllNotes,
  groupUsersByInterest,
  getUserPosts,
};
