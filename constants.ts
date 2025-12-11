import { TriviaQuestion } from './types';

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: '1',
    question: "Which Pokémon is known as the 'Electric Mouse'?",
    options: ["Raichu", "Pikachu", "Pichu", "Dedenne"],
    correctAnswer: 1,
    timeLimit: 10
  },
  {
    id: '2',
    question: "How many evolutions does Eevee have currently?",
    options: ["3", "5", "8", "9"],
    correctAnswer: 2,
    timeLimit: 10
  },
  {
    id: '3',
    question: "Who is the CEO of our company? (Test)",
    options: ["Ash Ketchum", "Giovanni", "Professor Oak", "Real CEO Name"],
    correctAnswer: 3,
    timeLimit: 15
  },
  {
    id: '4',
    question: "What color is a shiny Charizard?",
    options: ["Red", "Gold", "Black", "Purple"],
    correctAnswer: 2,
    timeLimit: 10
  },
  {
    id: '5',
    question: "Which year was the company founded?",
    options: ["1996", "2000", "2010", "2020"],
    correctAnswer: 2, // Example
    timeLimit: 15
  }
];

// Placeholder for Seating Chart
export const SEATING_CHART_URL = "https://picsum.photos/1200/800";