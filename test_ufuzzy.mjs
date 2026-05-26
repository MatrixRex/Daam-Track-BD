import uFuzzy from '@leeoniya/ufuzzy';

const uf = new uFuzzy();
const haystack = [
  "beef standard",
  "standard beef",
  "chicken egg",
  "egg chicken",
  "chicken farm egg"
];

const queries = ["chicken egg", "egg chicken"];

for (const q of queries) {
  console.log(`\nQuery: "${q}"`);
  const [, info, order] = uf.search(haystack, q, 5);
  
  if (order) {
    for (const infoIdx of order) {
      console.log(` - Match: ${haystack[info.idx[infoIdx]]}`);
    }
  } else {
    console.log("No matches.");
  }
}
