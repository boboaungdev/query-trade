import mongoose from "mongoose";
const { Schema } = mongoose;

const bookmarkSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["strategy", "backtest"],
      required: true,
      index: true,
    },

    target: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

bookmarkSchema.index(
  { user: 1, targetType: 1, target: 1 },
  { unique: true, name: "unique_user_target_bookmark" },
);
bookmarkSchema.index({ user: 1, targetType: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, targetType: 1, name: 1 });

export const BookmarkDB = mongoose.model("bookmark", bookmarkSchema);
