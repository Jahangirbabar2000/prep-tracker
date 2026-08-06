# JS 500 — Batch 01

**Q:** What are the possible ways to create objects in JavaScript
**A:** 8 ways to create an object:

- **Object literal** `{}` — simplest, most common.
- **`new Object()`** — rarely used now.
- **`Object.create(proto)`** — new object with an explicit prototype; sets up prototypal inheritance.
- **Function constructor + `new`** — pre-ES6 OOP.
- **Function constructor + `.prototype`** — shares methods across instances (memory-efficient).
- **`Object.assign({}, ...)`** — merges/clones source objects into a target.
- **ES6 `class`** — syntactic sugar over the prototype system.
- **Singleton** — closure-based `getInstance()`, or an ES module (naturally a singleton via its caching).
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-are-the-possible-ways-to-create-objects-in-javascript:~:text=What%20are%20the%20possible%20ways%20to%20create%20objects%20in%20JavaScript,-There%20are%20many%20ways%20to%20create%20objects

**Q:** What is a prototype chain
**A:** When you access a property on an object, JS looks on the object itself first.

If it's missing, the engine walks up the object's internal `[[Prototype]]` link (`Object.getPrototypeOf(obj)`) repeatedly until it finds the property or hits `null`.

For constructor-created objects, the chain is: instance → `Constructor.prototype` → ... → `null`. This is how JS does inheritance and property/method sharing without classes.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-a-prototype-chain:~:text=Back%20to%20Top-,What%20is%20a%20prototype%20chain,-The%20prototype%20chain

**Q:** What is the Difference Between call, apply, and bind
**A:** All three set `this` explicitly for a function call — they differ in when it runs and how args are passed:

- **`call(thisArg, a, b, ...)`** — invokes **immediately**, args listed individually.
- **`apply(thisArg, [a, b, ...])`** — invokes **immediately**, args passed as an array.
- **`bind(thisArg, a, b, ...)`** — does **not** invoke; returns a new function with `this` (and optionally some args) permanently pinned, to call later.

> Mnemonic: "**C**all = **C**omma-separated, **A**pply = **A**rray."
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between-call-apply-and-bind:~:text=Back%20to%20Top-,What%20is%20the%20Difference%20Between%20call%2C%20apply%2C%20and%20bind,-In%20JavaScript%2C%20call

**Q:** What is JSON and its common operations
**A:** JSON = a text-based data format using JS object syntax, used to move data between client and server (MIME type `application/json`).

- **`JSON.parse(str)`** — string → JS object.
- **`JSON.stringify(obj)`** — JS object → string.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-json-and-its-common-operations:~:text=Back%20to%20Top-,What%20is%20JSON%20and%20its%20common%20operations,-JSON%20%28JavaScript%20Object%20Notation%29%20is%20a%20lightweight

**Q:** What is the purpose of the array slice method
**A:** `arr.slice(start, end)` returns a **new array** containing the selected range.

- `end` is exclusive; omit it to go to the end of the array.
- Negative indices count from the end.
- Does **not** mutate the original array.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-purpose-of-the-array-slice-method:~:text=Back%20to%20Top-,What%20is%20the%20purpose%20of%20the%20array%20slice%20method,-The%20slice%28%29%20method%20in%20JavaScript

**Q:** What is the purpose of the array splice method
**A:** `arr.splice(start, deleteCount, item1, ...)` **mutates** the original array in place.

- Removes `deleteCount` elements starting at `start`.
- Can insert new items at that same position.
- Returns an array of the removed elements.
- Can remove and insert in a single call.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-purpose-of-the-array-splice-method:~:text=Back%20to%20Top-,What%20is%20the%20purpose%20of%20the%20array%20splice%20method,-The%20splice%28%29%20method%20in%20JavaScript

**Q:** What is the difference between slice and splice
**A:** - **`slice`** — read-only; returns a copy of a range; doesn't touch the original.
- **`splice`** — mutates the original array; removes/inserts/replaces elements; returns the removed elements (not a copy of the range).
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between-slice-and-splice:~:text=Back%20to%20Top-,What%20is%20the%20difference%20between%20slice%20and%20splice,-Here%20are%20the%20key%20differences

**Q:** How do you compare Object and Map
**A:** - **Key types** — `Map` keys can be any type (objects, functions, etc.); `Object` keys coerce to strings/symbols.
- **Size & iteration** — `Map` has a `.size` property and is directly iterable (`for...of`); `Object` needs `Object.keys/values/entries` and manual length counting.
- **Prototype** — `Map` has no prototype chain (no accidental key collisions); `Object` does.
- **Serialization** — `Object` serializes to JSON natively; `Map` doesn't.
**Link:** https://github.com/sudheerj/javascript-interview-questions#how-do-you-compare-object-and-map:~:text=Back%20to%20Top-,How%20do%20you%20compare%20Object%20and%20Map,-Objects%20and%20Maps%20both%20allow%20you

**Q:** What is the difference between == and === operators
**A:** - **`===`** (strict) — compares value **and** type, no coercion.
- **`==`** (loose) — coerces operands to a common type first.

Key gotchas:

- `null == undefined` → true, but `null === undefined` → false.
- `NaN == NaN` and `NaN === NaN` are both **false** (NaN never equals itself).
- `1 == "1"` → true; `1 === "1"` → false.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-is-the-difference-between--and--operators:~:text=Back%20to%20Top-,What%20is%20the%20difference%20between%20%3D%3D%20and%20%3D%3D%3D%20operators,-JavaScript%20provides%20two%20types%20of%20equality%20operators

**Q:** What are lambda expressions or arrow functions
**A:** Arrow functions (`=>`) are a concise function syntax (ES6).

They do **not** have their own:

- `this`
- `arguments`
- `super`
- `new.target`

— they inherit these from the enclosing lexical scope instead. They also can't be used as constructors (no `.prototype`) and can't be generators.

Best for callbacks/short computations, not object methods that need their own `this`.
**Link:** https://github.com/sudheerj/javascript-interview-questions#what-are-lambda-expressions-or-arrow-functions:~:text=Back%20to%20Top-,What%20are%20lambda%20expressions%20or%20arrow%20functions,-Introduced%20in%20ES6%2C%20arrow%20functions%20are%20often%20shorter
