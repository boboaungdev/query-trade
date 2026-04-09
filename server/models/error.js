import mongoose from "mongoose";
const { Schema } = mongoose;

const errorSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ["send_email"],
      required: true,
    },
    statusCode: {
      type: Number,
      default: 500,
    },
    stack: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ErrorDB = mongoose.model("error", errorSchema);
