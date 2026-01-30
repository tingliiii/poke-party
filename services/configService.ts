
import { db, storage } from "./firebase";
// Fix: Use namespace imports for firestore and storage to resolve "no exported member" errors in certain build environments
import * as firestore from "firebase/firestore";
import * as storagePkg from "firebase/storage";

const { doc, onSnapshot, setDoc } = firestore;
const { ref, uploadBytes, getDownloadURL } = storagePkg;

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
