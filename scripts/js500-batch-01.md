# JS 500 — Batch 01

**Q:** What are the possible ways to create objects in JavaScript
**A:** 8 ways: (1) **Object literal** `{}` — simplest, most common. (2) **`new Object()`** — rarely used now. (3) **`Object.create(proto)`** — new object with an explicit prototype, useful for prototypal inheritance. (4) **Function constructor** + `new` — pre-ES6 OOP. (5) **Function constructor + `.prototype`** — shares methods across instances (memory-efficient). (6) **`Object.assign({}, ...)`** — merges/clones source objects into a target. (7) **ES6 `class`** — syntactic sugar over the prototype system. (8) **Singleton** (closure-based `getInstance()`, or an ES module, which is naturally a singleton via caching) — ensures only one instance ever exists.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-are-the-possible-ways-to-create-objects-in-javascript:~:text=What%20are%20the%20possible%20ways%20to%20create%20objects%20in%20JavaScript,-There%20are%20many%20ways%20to%20create%20objects

**Q:** What is a prototype chain
**A:** When you access a property on an object, JS looks on the object itself first; if missing, it walks up the object's internal `[[Prototype]]` link (`Object.getPrototypeOf(obj)`) repeatedly until it finds the property or hits `null`. For constructor-created objects, the chain is: instance → `Constructor.prototype` → ... → `null`. This is how JS does inheritance and property/method sharing without classes.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-a-prototype-chain:~:text=Back%20to%20Top-,What%20is%20a%20prototype%20chain,-The%20prototype%20chain

**Q:** What is the Difference Between call, apply, and bind
**A:** All three set `this` explicitly for a function call. `call(thisArg, a, b, ...)` invokes **immediately** with args listed individually. `apply(thisArg, [a, b, ...])` invokes **immediately** but takes args as an array. `bind(thisArg, a, b, ...)` does **not** invoke — it returns a new function with `this` (and optionally some args) permanently pinned, to be called later. Mnemonic: "**C**all = **C**omma-separated, **A**pply = **A**rray."
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between-call-apply-and-bind:~:text=Back%20to%20Top-,What%20is%20the%20Difference%20Between%20call%2C%20apply%2C%20and%20bind,-In%20JavaScript%2C%20call

**Q:** What is JSON and its common operations
**A:** JSON = a text-based data format using JS object syntax, used to move data between client/server. Two core operations: `JSON.parse(str)` — string → JS object; `JSON.stringify(obj)` — JS object → string. MIME type `application/json`.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-json-and-its-common-operations:~:text=Back%20to%20Top-,What%20is%20JSON%20and%20its%20common%20operations,-JSON%20%28JavaScript%20Object%20Notation%29%20is%20a%20lightweight

**Q:** What is the purpose of the array slice method
**A:** `arr.slice(start, end)` returns a **new array** containing the selected range (`end` exclusive, omit for "to the end"). Negative indices count from the end. Does **not** mutate the original.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-purpose-of-the-array-slice-method:~:text=Back%20to%20Top-,What%20is%20the%20purpose%20of%20the%20array%20slice%20method,-The%20slice%28%29%20method%20in%20JavaScript

**Q:** What is the purpose of the array splice method
**A:** `arr.splice(start, deleteCount, item1, ...)` **mutates** the original array in place — removes `deleteCount` elements starting at `start` and/or inserts new items there. Returns an array of the removed elements. Can remove and insert in one call.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-purpose-of-the-array-splice-method:~:text=Back%20to%20Top-,What%20is%20the%20purpose%20of%20the%20array%20splice%20method,-The%20splice%28%29%20method%20in%20JavaScript

**Q:** What is the difference between slice and splice
**A:** `slice` = read-only, returns a copy of a range, doesn't touch the original. `splice` = mutates the original array, used to remove/insert/replace elements, and returns the removed elements (not a copy of the range).
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between-slice-and-splice:~:text=Back%20to%20Top-,What%20is%20the%20difference%20between%20slice%20and%20splice,-Here%20are%20the%20key%20differences

**Q:** How do you compare Object and Map
**A:** `Map` keys can be **any type** (objects, functions, etc.); `Object` keys coerce to strings/symbols. `Map` has a `.size` property and is directly iterable (`for...of`); `Object` needs `Object.keys/values/entries` and manual length counting. `Map` has no prototype chain (no accidental key collisions); `Object` does. `Object` serializes to JSON natively; `Map` doesn't.
**Link:** https://github.com/sudheerj/javascript-interview-questions#how-do-you-compare-object-and-map:~:text=Back%20to%20Top-,How%20do%20you%20compare%20Object%20and%20Map,-Objects%20and%20Maps%20both%20allow%20you

**Q:** What is the difference between == and === operators
**A:** `===` (strict) compares value **and** type, no coercion. `==` (loose) coerces operands to a common type first. Key gotchas: `null == undefined` → true, but `null === undefined` → false. `NaN == NaN` and `NaN === NaN` are both false (NaN never equals itself). `1 == "1"` → true; `1 === "1"` → false.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between--and--operators:~:text=Back%20to%20Top-,What%20is%20the%20difference%20between%20%3D%3D%20and%20%3D%3D%3D%20operators,-JavaScript%20provides%20two%20types%20of%20equality%20operators

**Q:** What are lambda expressions or arrow functions
**A:** Arrow functions (`=>`) are a concise function syntax (ES6). They do **not** have their own `this`, `arguments`, `super`, or `new.target` — they inherit these from the enclosing lexical scope. Can't be used as constructors (no `.prototype`), and can't be generators. Best for callbacks/short computations, not object methods that need their own `this`.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-are-lambda-expressions-or-arrow-functions:~:text=Back%20to%20Top-,What%20are%20lambda%20expressions%20or%20arrow%20functions,-Introduced%20in%20ES6%2C%20arrow%20functions%20are%20often%20shorter
