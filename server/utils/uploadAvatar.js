import { cloudinary } from "../configs/cloudinary.js";
import { resError } from "./response.js";

export const uploadAvatar = async ({ username, photourl, folder }) => {
  try {
    // Custom file name
    const public_id = `${username}_${Date.now()}`;

    // Upload new base64Media
    const result = await cloudinary.uploader.upload(photourl, {
      folder,
      public_id,
      resource_type: "image",
    });
    if (!result) {
      throw resError(400, "Upload avatar failed to the Cloudinary!");
    }

    return result.secure_url;
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    throw resError(400, "Failed to upload oauth profile photo to Cloudinary");
  }
};
