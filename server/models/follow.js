import mongoose from "mongoose";

const { Schema } = mongoose;

const followSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    following: {
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

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const FollowDB = mongoose.model("follow", followSchema);
