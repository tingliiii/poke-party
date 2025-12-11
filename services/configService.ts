
import { db, storage } from "./firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const subscribeToSeating = (callback: (url: string) => void) => {
  return onSnapshot(doc(db, 'config', 'seating'), (snap) => {
    if (snap.exists() && snap.data().url) {
      callback(snap.data().url);
    }
  });
};

export const uploadSeatingChart = async (file: File) => {
  const storageRef = ref(storage, `config/seating_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await setDoc(doc(db, 'config', 'seating'), { url }, { merge: true });
};
