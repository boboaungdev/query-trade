import { resError } from "./response.js";
import { cloudinary } from "../configs/cloudinary.js";

// Extract full public_id from the image URL
function getPublicIdFromUrl(url) {
  const parts = url.split("/");
  const versionIndex = parts.findIndex(
    (p) => p.startsWith("v") && !isNaN(p.substring(1)),
  );
  const publicIdWithExt = parts.slice(versionIndex + 1).join("/"); // Get everything after the version
  const publicId = publicIdWithExt.substring(
    0,
    publicIdWithExt.lastIndexOf("."),
  ); // Remove extension

  return publicId;
}

export const uploadAvatar = async ({ user, photourl, folder }) => {
  try {
    // Delete old avatar
    const oldAvatar = user?.avatar;

    if (oldAvatar && oldAvatar.includes("cloudinary")) {
      const publicId = getPublicIdFromUrl(oldAvatar);
      if (!publicId) {
        throw resError(400, "Failed to parse public ID!");
      }
      await cloudinary.uploader.destroy(publicId);
    }

    // Custom file name
    const public_id = `${user._id}_${Date.now()}`;

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
    throw resError(400, "Failed to upload avatar to Cloudinary");
  }
};
