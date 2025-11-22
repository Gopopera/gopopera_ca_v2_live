import { storage, ref, uploadBytes, getDownloadURL } from "../src/lib/firebase";

export async function uploadImage(path: string, file: File): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

export async function getImageUrl(path: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
}
