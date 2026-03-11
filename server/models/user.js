import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    avatar: {
      type: String,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    pushToken: {
      type: String,
    },
    authProviders: [
      {
        _id: false,
        provider: {
          type: String,
          enum: ["google", "server"],
          required: true,
        },
        providerId: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
userSchema.index({ name: 1 });
userSchema.index({ pushToken: 1 });
userSchema.index(
  { "authProviders.provider": 1, "authProviders.providerId": 1 },
  { unique: true },
);

export const UserDB = mongoose.model("user", userSchema);
