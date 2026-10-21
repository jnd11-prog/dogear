export type Book = {
  id: string;
  title: string;
  author: string;
  year: number;
  genre: "Literary" | "Speculative" | "Nonfiction" | "Poetry" | "Classic";
  themes: string[];
  blurb: string;
  hue: number;
};

export const BOOKS: Book[] = [
  { id: "gilead", title: "Gilead", author: "Marilynne Robinson", year: 2004, genre: "Literary", themes: ["faith", "fathers", "memory", "small town"], blurb: "A dying preacher writes a long letter to his young son — patient, luminous attention to ordinary grace.", hue: 70 },
  { id: "stoner", title: "Stoner", author: "John Williams", year: 1965, genre: "Literary", themes: ["work", "quiet lives", "disappointment", "love of books"], blurb: "An unremarkable professor's life, told so plainly it becomes devastating.", hue: 40 },
  { id: "remains", title: "The Remains of the Day", author: "Kazuo Ishiguro", year: 1989, genre: "Literary", themes: ["duty", "regret", "restraint", "unreliable narrator"], blurb: "A butler's road trip becomes a slow reckoning with everything he chose not to feel.", hue: 25 },
  { id: "housekeeping", title: "Housekeeping", author: "Marilynne Robinson", year: 1980, genre: "Literary", themes: ["sisters", "transience", "water", "grief"], blurb: "Two orphaned girls, an eccentric aunt, and a lake that keeps taking things.", hue: 200 },
  { id: "normal-people", title: "Normal People", author: "Sally Rooney", year: 2018, genre: "Literary", themes: ["intimacy", "class", "youth", "miscommunication"], blurb: "Two people circle each other for years, never quite saying the thing.", hue: 150 },
  { id: "left-hand", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", year: 1969, genre: "Speculative", themes: ["gender", "trust", "cold", "otherness"], blurb: "An envoy on a frozen world learns how little he understands about people.", hue: 220 },
  { id: "station-eleven", title: "Station Eleven", author: "Emily St. John Mandel", year: 2014, genre: "Speculative", themes: ["collapse", "art", "survival", "connection"], blurb: "After the end, a travelling troupe performs Shakespeare because survival is insufficient.", hue: 10 },
  { id: "never-let-me-go", title: "Never Let Me Go", author: "Kazuo Ishiguro", year: 2005, genre: "Speculative", themes: ["mortality", "childhood", "acceptance", "memory"], blurb: "Friends from an English boarding school slowly understand what they were made for.", hue: 340 },
  { id: "piranesi", title: "Piranesi", author: "Susanna Clarke", year: 2020, genre: "Speculative", themes: ["solitude", "wonder", "identity", "labyrinth"], blurb: "A gentle man catalogues an endless house of statues and tides — and something is wrong.", hue: 180 },
  { id: "parable", title: "Parable of the Sower", author: "Octavia E. Butler", year: 1993, genre: "Speculative", themes: ["change", "faith", "community", "climate"], blurb: "A teenage girl with radical empathy builds a new belief system as California burns.", hue: 30 },
  { id: "h-is-for-hawk", title: "H Is for Hawk", author: "Helen Macdonald", year: 2014, genre: "Nonfiction", themes: ["grief", "nature", "fathers", "wildness"], blurb: "After her father dies, a writer trains a goshawk and nearly disappears into it.", hue: 90 },
  { id: "braiding", title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", year: 2013, genre: "Nonfiction", themes: ["plants", "reciprocity", "indigenous knowledge", "gratitude"], blurb: "A botanist braids science and Potawatomi teaching into an ethic of gift.", hue: 110 },
  { id: "year-magical", title: "The Year of Magical Thinking", author: "Joan Didion", year: 2005, genre: "Nonfiction", themes: ["grief", "marriage", "control", "precision"], blurb: "Didion turns her cool, exact sentences on the year her husband died.", hue: 0 },
  { id: "bluets", title: "Bluets", author: "Maggie Nelson", year: 2009, genre: "Poetry", themes: ["blue", "heartbreak", "obsession", "fragments"], blurb: "240 numbered propositions about the colour blue and a love that ended.", hue: 240 },
  { id: "citizen", title: "Citizen", author: "Claudia Rankine", year: 2014, genre: "Poetry", themes: ["race", "everyday harm", "the body", "witness"], blurb: "Lyric fragments of daily racism that accumulate into undeniable weight.", hue: 0 },
  { id: "devotions", title: "Devotions", author: "Mary Oliver", year: 2017, genre: "Poetry", themes: ["attention", "nature", "joy", "prayer"], blurb: "Fifty years of looking closely at ponds, owls, and the mystery of being alive.", hue: 130 },
  { id: "mrs-dalloway", title: "Mrs Dalloway", author: "Virginia Woolf", year: 1925, genre: "Classic", themes: ["consciousness", "time", "city", "trauma"], blurb: "One June day in London, flowing from mind to mind.", hue: 300 },
  { id: "middlemarch", title: "Middlemarch", author: "George Eliot", year: 1871, genre: "Classic", themes: ["ambition", "marriage", "community", "moral growth"], blurb: "A whole town's hopes and compromises, observed with enormous sympathy.", hue: 50 },
  { id: "moby-dick", title: "Moby-Dick", author: "Herman Melville", year: 1851, genre: "Classic", themes: ["obsession", "sea", "digression", "the unknowable"], blurb: "A whaling voyage, a mad captain, and every tangent a curious mind could take.", hue: 210 },
  { id: "giovanni", title: "Giovanni's Room", author: "James Baldwin", year: 1956, genre: "Classic", themes: ["desire", "shame", "exile", "Paris"], blurb: "An American in Paris cannot let himself love the man he loves.", hue: 15 },
];

export const BOOK_IDS = BOOKS.map((b) => b.id) as [string, ...string[]];
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
