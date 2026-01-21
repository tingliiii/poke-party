
import { db } from "./firebase";
import { doc, collection, onSnapshot, updateDoc, setDoc, increment, deleteDoc } from "firebase/firestore";
import { TriviaGameState, TriviaQuestion } from "../types";

const TRIVIA_COLLECTION = 'trivia';
const STATE_DOC = 'global_state';
const QUESTIONS_COLLECTION = 'trivia_questions';
const USERS_COLLECTION = 'users';

export const subscribeToTriviaState = (callback: (state: TriviaGameState) => void, onError?: (error: Error) => void) => {
  const ref = doc(db, TRIVIA_COLLECTION, STATE_DOC);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as TriviaGameState);
    } else {
      const initial: TriviaGameState = { status: 'LOBBY', currentQuestionIndex: -1, answers: {} };
      setDoc(ref, initial);
      callback(initial);
    }
  }, (error) => {
    if (onError) onError(error);
  });
};

export const subscribeToQuestions = (callback: (qs: TriviaQuestion[]) => void, onError?: (error: Error) => void) => {
  return onSnapshot(collection(db, QUESTIONS_COLLECTION), (snap) => {
    const qs = snap.docs.map(d => d.data() as TriviaQuestion);
    // 依 ID (題號) 排序
    qs.sort((a,b) => parseInt(a.id) - parseInt(b.id));
    callback(qs);
  }, (error) => {
    if (onError) onError(error);
  });
};

export const updateTriviaState = async (updates: Partial<TriviaGameState>) => {
  await updateDoc(doc(db, TRIVIA_COLLECTION, STATE_DOC), updates);
};

export const addTriviaQuestion = async (q: TriviaQuestion) => {
  await setDoc(doc(db, QUESTIONS_COLLECTION, q.id), q);
};

// 新增：刪除題目
export const deleteTriviaQuestion = async (questionId: string) => {
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, questionId));
};

export const submitAnswer = async (userId: string, answerIdx: number, timeTaken: number, score: number) => {
  const stateRef = doc(db, TRIVIA_COLLECTION, STATE_DOC);
  await updateDoc(stateRef, {
    [`answers.${userId}`]: { answerIdx, timeTaken, score }
  });
  
  if (score > 0) {
    await updateDoc(doc(db, USERS_COLLECTION, userId), { score: increment(score) });
  }
};
