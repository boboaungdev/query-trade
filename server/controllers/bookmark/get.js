import { resJson } from "../../utils/response.js";
import { BookmarkDB } from "../../models/bookmark.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getBookmarks = async (req, res, next) => {
  try {
    const user = req.user;
    const { page, limit, targetType, sortBy, order, search } =
      req.validatedQuery;

    const filter = {
      user: user._id,
    };

    if (targetType) {
      filter.targetType = targetType;
    }

    const searchValue = search?.trim();
    if (searchValue) {
      filter.name = { $regex: escapeRegex(searchValue), $options: "i" };
    }

    const sortOrder = order === "desc" ? -1 : 1;

    const staleCandidates = await BookmarkDB.find(filter)
      .select("_id")
      .populate("target", "_id")
      .lean();

    const staleBookmarkIds = staleCandidates
      .filter((bookmark) => !bookmark.target)
      .map((bookmark) => bookmark._id);

    if (staleBookmarkIds.length > 0) {
      await BookmarkDB.deleteMany({
        _id: { $in: staleBookmarkIds },
      });
    }

    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      BookmarkDB.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "target",
          populate: {
            path: "user",
            select: "username",
          },
        })
        .lean(),
      BookmarkDB.countDocuments(filter),
    ]);

    const totalPage = Math.ceil(total / limit);

    return resJson(res, 200, "Bookmarks fetched successfully.", {
      total,
      totalPage,
      currentPage: page,
      limitPerPage: limit,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
      bookmarks,
    });
  } catch (error) {
    next(error);
  }
};
