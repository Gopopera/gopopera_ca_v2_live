import { firebaseStorage } from "./client";
import { ref, uploadBytes, getDownloadURL, UploadResult } from "firebase/storage";

export async function uploadImage(path: string, file: File): Promise<string> {
  try {
    const storageRef = ref(firebaseStorage, path);
    const uploadResult: UploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

export async function getImageUrl(path: string): Promise<string | null> {
  try {
    const storageRef = ref(firebaseStorage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
}

