# Low-Level Design — Hello Interview Deck

Source of truth for the **Low-Level Design** domain. Add a question, then run:

```
node scripts/seed-lld.mjs
```

Re-running is safe: the domain and its fields are reused, cards already in the
DB are matched on the exact question text, and an answer edited here is pushed
to the existing card. This file is the source of truth for answers — edit here,
not in the app, or the next run will overwrite it.

Format:

- `## <Topic>` — becomes the card's `lld_topic`. One section per source article.
  **Section order is the dropdown order:** the seed rewrites each option's
  `sort_order` to match this file, and the app renders the Topic and Bucket
  filters by `sort_order`. Reordering in Settings instead will be overwritten
  by the next run.
- `Bucket: <name>` — the `lld_category` every card in that section belongs to.
  A topic name is NOT unique here: `Introduction` is a topic under both
  `In a Hurry` and `Concurrency`, which is why the parser tracks the section
  currently open rather than keying off the heading text.
- `Link: <url>` — the article every card in that section came from. Attached to
  each card as a `links` row, labelled with the card's own question text.
- `Anchor: <slug>` — optional, one line between a card's `**Q:**` and `**A:**`.
  Deep-links that card into the section's article, so the link lands on the
  paragraph the card came from instead of the top of a long page. Adding or
  changing one moves the card's existing link rather than adding a second.
- `**Q:** …` / `**A:** …` — one card. Answers may span multiple lines.

**Complete.** This file holds the whole deck, one section per article, so the
orphan check covers every card. The cards predate this file and were recovered
verbatim from the DB, which is why re-running the seed reports them unchanged
rather than inserting duplicates.

## Card style — match the existing LLD cards

One card, one fact. Answer first, then the supporting detail. Target 250–450
characters; the seed warns past 550. Bold the term being defined, keep lists
short, and never restate the question in the answer.

## Introduction
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/low-level-design/in-a-hurry/introduction

**Q:** What is the primary focus of an LLD interview?
**A:** Designing the objects, classes, methods, and interactions needed to implement a single feature or service, not architecture at scale.

- You work through class definitions, state, and method signatures
- Contrast with System Design, which deals with services, scaling, and data flow across a distributed system
- Output is usually pseudocode or partial real code, not boxes and arrows diagrams

**Q:** What five skills do LLD interviewers evaluate?
Anchor: interview-assessment
**A:** - Problem Analysis: do you scope the problem and ask clarifying questions before coding
- Class Design: are responsibilities, method signatures, and ownership boundaries clean
- Code Quality: encapsulation, state management, composition or inheritance choices, naming
- Extensibility and Maintainability: can the design absorb new requirements without a rewrite
- Communication: clear narrative and ability to adapt when the interviewer probes

**Q:** What do modern production systems favor over classical deep OOP hierarchies?
Anchor: what-is-this-guide
**A:** - Composition over inheritance
- Simple state over deep class hierarchies
- Pragmatism over pattern worship, since patterns are tools, not goals

The guide pushes back against textbook OOP that overfits to academic exercises rather than real interview or production behavior.

**Q:** What is rewarded vs. not rewarded under extensibility assessment?
Anchor: extensibility-and-maintainability
**A:** Rewarded: designs that adapt cleanly to actual new requirements. 

Not rewarded: designs that try to anticipate every possible future requirement. Over-engineering for hypothetical futures is a negative signal, not a positive one.

## Delivery Framework
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/low-level-design/in-a-hurry/delivery

**Q:** What are the five steps of the LLD Delivery Framework, and how long should each take out of about 35 minutes total?
Anchor: 1-requirements-5-minutes
**A:** - Requirements: about 5 min
- Entities and Relationships: about 3 min
- Class Design: about 10-15 min
- Implementation: about 10 min
- Extensibility: about 5 min, if time allows

This pacing prevents two failure modes: diving into code too early, or over-scoping requirements and running out of time.

**Q:** What four themes generate clarifying questions during the Requirements step?
Anchor: 1-requirements-5-minutes
**A:** - Primary capabilities: what operations must the system support
- Rules and completion: what defines success, failure, or state transitions
- Error handling: how should invalid inputs or actions be handled
- Scope boundaries: what's explicitly in scope vs. out of scope (UI, storage, concurrency, etc.)

These four themes generalize across any prompt: games, devices, workflows, transaction systems.

**Q:** What filter determines if something is its own entity vs. just a field on another class?
Anchor: identify-entities
**A:** It's an entity if it maintains changing state or enforces rules. It's just a field if it's static information attached to something else. This keeps the design from ballooning into unnecessary micro-objects while still capturing real structure.

**Q:** What is "Tell, Don't Ask" and why does it matter in Class Design?
Anchor: 3-class-design-10-15-minutes
**A:** The principle that objects should manage their own state and expose behavior, rather than exposing getters for external callers to make decisions.

- Keeps rules colocated with the state they govern
- Makes APIs smaller and more predictable
- When something breaks, you know exactly which class owns the bug

**Q:** Under "Tell, Don't Ask," where do workflow rules belong vs. data-specific rules?
Anchor: 3-class-design-10-15-minutes
**A:** Workflow and lifecycle rules, such as "can this operation run right now," belong in the orchestrator, for example the Game class. Data-specific rules, such as "is this cell already occupied," belong in the entity that owns that data, for example the Board class.

**Q:** Why does Hello Interview recommend against UML diagrams in LLD interviews?
Anchor: what-about-uml-diagrams
**A:** - UML is outdated and rarely used in real production design work
- Adds formality and ceremony that slows down real-time iteration and feedback
- Evidence cited: Microsoft removed UML tooling from Visual Studio in 2016 due to near-zero usage
- If an interviewer explicitly wants UML, ask if simplified class notation is acceptable instead, usually yes

**Q:** What two parts should a method walkthrough cover during Implementation?
Anchor: 4-implementation-10-minutes
**A:** - Happy path: the normal linear flow of inputs, sequence of steps, internal calls, return value or state change
- Edge cases: invalid inputs, illegal operations, out-of-range values, calls violating current state

Demonstrating edge-case awareness signals you think like a production engineer, not someone writing toy logic.

**Q:** What is the purpose of the post-implementation verification walkthrough?
Anchor: verification-walk-through-a-specific-scenario
**A:** To trace through a concrete scenario step by step and catch logical errors before the interviewer does.

- Show: initial state, what happens per operation, how state changes, edge-case transitions
- Many interviewers explicitly grade this as part of the rubric
- If you find a bug here, fix it on the spot. This is a positive signal, not a negative one

**Q:** What is Hello Interview's warning on design patterns such as Singleton, Factory, or Builder during Implementation?
Anchor: 4-implementation-10-minutes
**A:** Overengineering by forcing patterns where they don't add value is a more common and more damaging mistake than failing to include a needed pattern. Only introduce a pattern when it naturally fits.

**Q:** How does extensibility depth expectation scale by candidate level?
Anchor: 5-extensibility-5-minutes-if-time-and-level-allow
**A:** - Junior: little to none
- Mid-level: 1-2 small follow-ups
- Senior: several chained "what if we" questions

The interviewer drives this step. You respond by pointing to design boundaries that make the change clean, without rewriting code.

## Design Principles
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/low-level-design/in-a-hurry/design-principles

**Q:** What are the three general software design principles worth memorizing first?
Anchor: general-software-design-principles
**A:** KISS, DRY, and YAGNI. These three carry you through most LLD interviews even if you forget everything else on the list.

**Q:** What does KISS mean and what is the most common way it gets violated in interviews?
Anchor: kiss-keep-it-simple-stupid
**A:** Keep It Simple, Stupid. The simplest solution that works is usually the right one.

- Candidates over-engineer to show off pattern knowledge, introducing factories, builders, or decorators when a basic class would work
- Add complexity only when simplicity actually stops working, such as a single class growing to 500 lines with ten responsibilities
- This is the single principle the guide says is violated most often in LLD interviews

**Q:** What does DRY mean and where does it conflict with KISS?
Anchor: dry-don-t-repeat-yourself
**A:** Don't Repeat Yourself. When the same logic appears in multiple places, pull it into one shared location so bugs and rule changes only need to be fixed once.

- Only applies when the logic is conceptually the same, not just textually similar
- Forcing unrelated code to share an abstraction creates artificial coupling
- DRY conflicts with KISS since sometimes duplicating code is simpler than building an abstraction, and recognizing that tradeoff is a senior-level signal

**Q:** What does YAGNI mean and what is a common misinterpretation of it?
Anchor: yagni-you-aren-t-gonna-need-it
**A:** You Aren't Gonna Need It. Build what the current requirements need, not what might be needed later.

- Don't add support for features the requirements never mentioned, such as valet parking in a parking lot system
- This principle doesn't mean "never think ahead" - it means don't build ahead. Design with extension in mind, but only implement what's needed now.
- Comes up naturally when the interviewer asks "how would you extend this," which is the cue to discuss future flexibility

**Q:** What is Separation of Concerns and what problem does it solve?
Anchor: separation-of-concerns
**A:** Different parts of the code should handle different responsibilities and shouldn't know about each other's internals, such as UI logic staying separate from business logic and data storage.

Example of violating Separation of Concerns by mixing display, input handling, and game rules in one method:

```plaintext
class TicTacToe:
    def play(self):
        while True:
            for row in self.board:
                print(row)
            row = int(input())
            col = int(input())
            self.board[row][col] = "X"
```

Example of following Separation of Concerns by splitting responsibilities into their own classes:

```plaintext
class TicTacToe:
    def __init__(self, board, display, input_handler):
        self.board = board
        self.display = display
        self.input_handler = input_handler

    def play(self):
        while not self.board.has_winner():
            self.display.render(self.board)
            move = self.input_handler.get_next_move()
            self.board.make_move(move)
```

This isolates each change to one class and lets you test each part of the system independently.

**Q:** What is the Law of Demeter and what code pattern signals a violation?
Anchor: law-of-demeter
**A:** Also called the principle of least knowledge. A method should only talk to its immediate friends, not reach through objects to access distant parts of the system.

- Code like `order.getCustomer().getAddress().getZipCode()` violates this by coupling your code to the internal structure of three different objects
- The fix is a method like `getCustomerZipCode()` that handles the internal navigation itself
- Fluent method chaining, such as `builder.setName("John").setAge(30).build()`, is fine since it returns the same object type; the violation is specifically chaining that leaks internal structure across different object types

**Q:** Why is SOLID falling out of fashion outside of Java and C#?
Anchor: object-oriented-design-principles-solid
**A:** SOLID originated from Java's era of deep inheritance hierarchies and interface-heavy design. Modern languages favor composition over class hierarchies and functions over interfaces, so applying SOLID everywhere can break KISS by adding complexity for its own sake.

**Q:** What is the Single Responsibility Principle (SRP)?
Anchor: srp-single-responsibility-principle
**A:** A class should have one, and only one, reason to change. If a class mixes multiple concerns, split them.

Example of violating SRP by mixing content generation, PDF formatting, and file storage in one class:

```plaintext
class Report:
    def generate_content(self) -> str:
        return "content"

    def print_to_pdf(self) -> None:
        pass

    def save_to_file(self) -> None:
        pass
```

Example of following SRP by splitting these into separate classes:

```plaintext
class Report:
    def generate_content(self) -> str:
        return "content"

class PDFPrinter:
    def print(self, report: Report) -> None:
        pass

class FileStorage:
    def save(self, content: str) -> None:
        pass
```

Now each responsibility can change independently without affecting the others.

**Q:** What is the Open/Closed Principle (OCP)?
Anchor: ocp-open-closed-principle
**A:** Classes should be open for extension but closed for modification, meaning you can add new behavior without changing existing code.

Example of violating OCP, where adding a new payment type requires modifying the method:

```plaintext
class PaymentProcessor:
    def process(self, payment_type: str, amount: float) -> None:
        if payment_type == "credit":
            pass
        elif payment_type == "paypal":
            pass
```

Example of following OCP using an interface, so new payment types are added without touching existing code:

```plaintext
class PaymentMethod(ABC):
    @abstractmethod
    def process(self, amount: float) -> None:
        ...

class CreditCardPayment(PaymentMethod):
    def process(self, amount: float) -> None:
        pass

class PaymentProcessor:
    def process(self, method: PaymentMethod, amount: float) -> None:
        method.process(amount)
```

Adding cryptocurrency support now just means creating a new class, with zero changes to `PaymentProcessor`.

**Q:** What is the Liskov Substitution Principle (LSP)?
Anchor: lsp-liskov-substitution-principle
**A:** Objects of a superclass shall be replaceable with objects of its subclasses without breaking the application. Or simply put, subclasses must work wherever the base class works, without breaking the expectations the parent class sets.

- A subclass throwing an exception for a method the parent provides is a red flag
- A subclass forcing callers to add special-case checks, like `if (bird instanceof Penguin)`, is also a violation
- Classic example: `Penguin extends Bird` breaks the expectation that all birds can fly if `Bird` defines a `fly()` method
- The fix is separating flying behavior into its own interface, such as `FlyingBird`, so only birds that actually fly implement it

**Q:** What is the Interface Segregation Principle (ISP)?
Anchor: isp-interface-segregation-principle
**A:** No client should be forced to depend on methods it does not use. Prefer small, focused interfaces over large general-purpose ones, so classes are never forced to implement methods they don't need.

- Fat interfaces force empty implementations or methods that throw exceptions, which is a code smell
- Example: a `Worker` interface with `work`, `eat`, and `sleep` forces a `Robot` class to implement `eat` and `sleep` even though robots don't do either
- The fix is splitting into smaller interfaces like `Workable`, `Feedable`, and `Restable`, and letting each class implement only what applies

**Q:** What is the Dependency Inversion Principle (DIP)?
Anchor: dip-dependency-inversion-principle
**A:** High-level modules should not depend on low-level modules; both should depend on abstractions (e.g., interfaces). Or simply put, code should depend on abstractions, not concrete implementations. The high-level business logic defines the contract, and the low-level implementation conforms to it, rather than the other way around.

Example of violating DIP, where `NotificationService` is tightly coupled to a concrete `EmailSender`:

```plaintext
class NotificationService:
    def __init__(self) -> None:
        self.email_sender = EmailSender()

    def notify(self, message: str) -> None:
        self.email_sender.send(message)
```

Example of following DIP by depending on a `MessageSender` interface instead:

```plaintext
class MessageSender(ABC):
    @abstractmethod
    def send(self, message: str) -> None:
        ...

class NotificationService:
    def __init__(self, sender: MessageSender) -> None:
        self.sender = sender

    def notify(self, message: str) -> None:
        self.sender.send(message)
```

This lets you swap email for SMS by injecting a different implementation, and lets you unit test with a mock sender instead of sending real messages.

**Q:** Is Dependency Inversion the same thing as dependency injection?
Anchor: dip-dependency-inversion-principle
**A:** No. DIP is the design principle that code should depend on abstractions. Dependency injection, passing dependencies through the constructor, is one technique for achieving DIP, not the principle itself.

## OOP Concepts
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/low-level-design/in-a-hurry/oop-concepts

**Q:** What is encapsulation and why do interviewers check for it?
Anchor: encapsulation
**A:** Keeping an object's data private and letting the object control how that data is used, interacting through methods instead of direct field access.

- Enforces rules, such as preventing negative balances, inside methods like `deposit()` and `withdraw()` rather than hoping callers behave
- Interviewers check whether fields are exposed directly or through methods, and whether mutable internal collections are returned as references or as copies
- Rule of thumb: if deciding whether to expose a field or write a getter, write the getter

Example of violating encapsulation with a public, directly mutable list:
```plaintext
class ParkingLot:
    def __init__(self):
        self.spots: list[ParkingSpot] = []  # public, mutable
```
Example of proper encapsulation, where the list is private and only modified through a method:

```plaintext
class ParkingLot:
    def __init__(self):
        self._spots: list[ParkingSpot] = []

    def park_vehicle(self, vehicle: Vehicle) -> bool:
        spot = self._find_available_spot(vehicle)
        if spot is None:
            return False
        spot.occupy(vehicle)
        return True

    @property
    def spots(self) -> list[ParkingSpot]:
        return list(self._spots)
```

**Q:** What is abstraction and when should you introduce it?
Anchor: abstraction
**A:** Exposing only what's essential and hiding implementation details behind a clear interface, defining what something can do without revealing how.

- Introduce abstraction where logic feels tangled, has many variations, or requirements suggest multiple approaches
- The hard part is choosing the right level: too abstract and the interface becomes meaningless, like `doWork()`; too specific and nothing has actually been abstracted
- Think about what operations the caller needs, not how those operations happen internally

Example of violating abstraction, where `OrderService` is tightly coupled to a specific payment API:

```plaintext
class OrderService:
    def __init__(self, api_key: str):
         self.api_key = api_key

    def checkout(self, order: Order) -> None:
         stripe = StripeAPI()
         stripe.set_api_key(self.api_key)
         stripe.create_charge(order.total, order.credit_card)
```

Example of proper abstraction using a `PaymentMethod` interface:

```plaintext
class PaymentMethod(ABC):
    @abstractmethod
    def process(self, amount: float) -> bool:
          ...

class OrderService:
    def __init__(self, payment_method: PaymentMethod):
        self.payment_method = payment_method

    def checkout(self, order: Order) -> None:
        self.payment_method.process(order.total)
```

`OrderService` no longer cares which payment implementation it receives.

**Q:** What is polymorphism and what code smell signals you should be using it?
Anchor: polymorphism
**A:** Letting each object handle itself when the same action is called, rather than branching based on type. Writing type checks or switch statements on an enum is the signal you should reach for polymorphism instead.

- Naturally follows from abstraction: once an interface like `Vehicle` is defined, each implementation decides its own behavior
- Tradeoff to mention in interviews: polymorphism gives flexibility and extensibility but can make code flows harder to trace and debug as implementations grow
- Each company has a different tolerance for it, some prefer explicit branches over deep polymorphic chains

Example of violating polymorphism with type checks:

```plaintext
class ParkingLot:
    def park_vehicle(self, vehicle: Vehicle) -> bool:
        if vehicle.type == "car":
            spot = self._find_spot_by_size("regular")
            return spot is not None
        elif vehicle.type == "motorcycle":
            spot = self._find_spot_by_size("motorcycle")
            return spot is not None
        return False
```

Example of using polymorphism instead, letting each vehicle type report its own required spot size:

```plaintext
class Vehicle:
    def get_required_spot_size(self) -> SpotSize:
        raise NotImplementedError

class Car(Vehicle):
    def get_required_spot_size(self) -> SpotSize:
        return SpotSize.REGULAR

class ParkingLot:
    def park_vehicle(self, vehicle: Vehicle) -> bool:
        required = vehicle.get_required_spot_size()
        spot = self._find_spot_by_size(required)
        return spot is not None
```

Adding a new vehicle type now just means creating a new class; `ParkingLot` never changes.

**Q:** What is the "fragile base class" problem with inheritance?
Anchor: inheritance
**A:** When a subclass inherits a parent's fields and methods, any change to the parent can break every child class, creating tight coupling and rigidity rather than solving it.

**Q:** When does inheritance actually make sense, according to the guide?
Anchor: when-inheritance-works
**A:** When there is stable, shared implementation that multiple subclasses genuinely need, and the subclasses don't need to override that behavior in ways that break the parent's contract.

Example of inheritance used correctly, where deposit/withdraw/balance logic is identical across account types:

```plaintext
class BankAccount:
    def __init__(self):
        self.balance = 0.0

    def deposit(self, amount: float) -> None:
        self.balance += amount

    def withdraw(self, amount: float) -> bool:
        if self.balance < amount:
            return False
        self.balance -= amount
        return True

class SavingsAccount(BankAccount):
    def __init__(self, interest_rate: float):
        super().__init__()
        self.interest_rate = interest_rate

class CheckingAccount(BankAccount):
    def __init__(self, overdraft_limit: int):
        super().__init__()
        self.overdraft_limit = overdraft_limit
```

**Q:** What is the classic mistake candidates make with inheritance, and what's the fix?
Anchor: when-inheritance-breaks-down
**A:** Using inheritance to model behavior differences rather than shared implementation, forcing subclasses to override methods with completely different logic.

Example of misusing inheritance for behavior variation, where `ElectricCar` shares no real logic with `Car`:

```plaintext
class Car:
    def start_engine(self) -> None:
        # gasoline engine start logic
        ...

class ElectricCar(Car):
    def start_engine(self) -> None:
        # electric motor startup logic - completely different
        ...
```

This breaks down further when a hybrid car needs to be modeled, since neither `Car` nor `ElectricCar` fits cleanly.

Fix: isolate the varying behavior into its own abstraction and compose it instead:

```plaintext
class Drivetrain(ABC):
    @abstractmethod
    def start(self) -> None:
        ...

class GasEngine(Drivetrain):
    def start(self) -> None:
        ...

class ElectricMotor(Drivetrain):
    def start(self) -> None:
        ...

class Car:
    def __init__(self, drivetrain: Drivetrain):
        self.drivetrain = drivetrain
  
    def start(self) -> None:
        self.drivetrain.start()
```

A hybrid car is now just a car given two drivetrains, and `Car` itself never changes.

**Q:** What is the default recommendation between inheritance and composition for LLD interviews?
Anchor: putting-it-together
**A:** Default to interfaces with composition. Only reach for inheritance when implementation genuinely needs to be shared and the relationship between classes is stable. In most LLD interviews, inheritance isn't needed at all.

## Design Patterns
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/low-level-design/in-a-hurry/patterns

**Q:** Why does Hello Interview only cover a handful of the 23 Gang of Four patterns?
Anchor: creational-patterns
**A:** Modern languages built in features that replaced many of them, such as iterators becoming primitives instead of patterns, and the shift from inheritance-heavy OOP to composition made others obsolete.

- In real interviews you'll get asked about maybe five patterns total, not twenty-three
- Patterns arise from good design decisions rather than driving them, so forcing one where it doesn't belong signals over-engineering
- Design pattern emphasis is regional: US interviews mostly evaluate design quality without naming patterns, while India-based interviews are more likely to ask about patterns directly by name

**Q:** What are the three categories design patterns fall into?
Anchor: creational-patterns
**A:** Creational, Structural, and Behavioral.

- Creational patterns control how objects get created (Factory, Builder, Singleton)
- Structural patterns control how objects connect to each other (Decorator, Facade)
- Behavioral patterns control how objects interact and distribute responsibilities (Strategy, Observer, State)

**Q:** What is the Factory pattern and when does it show up in interviews?
Anchor: factory-method
**A:** A factory is a helper that creates the right kind of object so calling code doesn't have to decide which concrete class to instantiate.

- Shows up when requirements say things like "support different notification types" or "handle multiple payment methods"
- Centralizes creation logic in one place, so adding a new type means updating the factory, not scattering `new EmailNotification()` calls throughout the codebase
- What's typically implemented in interviews is Simple Factory, not the more complex Gang of Four Factory Method with abstract factory subclasses

```plaintext
class NotificationFactory:
    @staticmethod
        def create(notification_type: str) -> Notification:
            if notification_type == "email":
                return EmailNotification()
            elif notification_type == "sms":
                return SMSNotification()
            raise ValueError("Unknown type")
```

**Q:** What is the Builder pattern and when is it actually needed?
Anchor: builder
**A:** A helper that constructs a complex object step by step, avoiding constructors with many optional or messy parameters.

- Common for designing things like HTTP requests, database queries, or configuration objects
- Only needed when the interviewer describes an object with many optional parts; most interview problems involve simple domain objects with 2-4 required fields where a normal constructor is fine
- Note: Builder is less idiomatic in Python, where dataclasses, keyword arguments, or default values are usually better alternatives

```plaintext
request = (HttpRequest.Builder()
    .url("https://api.example.com")
    .method("POST")
    .header("Content-Type", "application/json")
    .build())
```

**Q:** What is the Singleton pattern and why does the guide caution against it?
Anchor: singleton
**A:** Singleton ensures only one instance of a class exists, useful for shared resources like a configuration manager or connection pool.

- Most of the time it isn't actually needed; passing shared objects through constructors is clearer and easier to test
- Singletons hide dependencies and make testing harder
- If an interviewer asks "should this be a Singleton," the answer is usually no unless a single shared instance across the whole system is explicitly required
- In Python specifically, module-level variables are natural singletons since modules only load once

**Q:** What is the Decorator pattern and what phrasing in requirements signals it?
Anchor: decorator
**A:** Adds behavior to an object at runtime without changing its class, by wrapping the base object in layers.

- Signals in requirements: "optional features," "stack behaviors," "combine multiple enhancements," or "add logging/encryption to specific operations"
- Avoids a combinatorial explosion of subclasses like `LoggedEmailNotification`, `EncryptedEmailNotification`, `LoggedEncryptedEmailNotification`
- Choose Decorator when behavior depends on runtime conditions; choose a plain subclass when the behavior difference is a fixed, predefined type

```plaintext
source = FileDataSource("data.txt")
source = EncryptionDecorator(source)
source = CompressionDecorator(source)
source.write_data("sensitive info")
```

**Q:** What is the Observer pattern and what requirement phrasing signals it?
Anchor: observer
**A:** Lets objects subscribe to events and get notified automatically when something happens.

- Signal phrasing: "notify" or "update multiple components"
- Common use case: a stock price changes and multiple displays need to update, or an order is placed and inventory, notifications, and analytics all need to know
- The subject doesn't need to know what observers do with the information, it just calls each observer's `update()` method

```plaintext
class Stock(Subject):
    def set_price(self, price: float) -> None:
        self.price = price
        self.notify_observers()

    def notify_observers(self) -> None:
        for observer in self._observers:
            observer.update(self.symbol, self.price)
```

**Q:** What is the Facade pattern, and why do candidates rarely need to name it?
Anchor: facade
**A:** A facade is a coordinator class that hides complexity behind a clean interface. Most orchestrator classes built naturally in LLD interviews, like a Tic Tac Toe `Game` class, already are facades.

- The pattern name is more useful when wrapping existing messy legacy code, not when designing a clean orchestrator from scratch
- In interviews you're usually already doing the right thing instinctively; you don't need to announce the pattern name

**Q:** What is the Strategy pattern and why is it the most important pattern to know?
Anchor: strategy
**A:** Replaces conditional logic with polymorphism, letting you swap between different ways of doing the same thing at runtime.

- It's the single most common pattern in LLD interviews because it directly tests understanding of polymorphism and composition over inheritance
- Signal to use it: a pile of if/else or switch statements based on type
- Distinction from Factory: Factory decides which object gets created; Strategy decides which behavior an already-existing object uses

```plaintext
class ShoppingCart:
    def __init__(self):
        self.payment_strategy = None

    def set_payment_strategy(self, strategy: PaymentStrategy) -> None:
        self.payment_strategy = strategy

    def checkout(self, amount: float) -> None:
        self.payment_strategy.pay(amount)
```

**Q:** What is the State Machine pattern and what requirement phrasing signals it?
Anchor: state-machine
**A:** Encapsulates each state's behavior in its own class, replacing scattered conditionals that check current state everywhere.

- Signal: the word "state" appearing multiple times in the requirements, or systems like vending machines, document workflows, or game states
- When present, the state machine is usually the centerpiece of the entire design and the most important thing to walk through
- Drawing a state diagram (states as circles, transitions as labeled arrows) is one of the best ways to communicate this design in an interview

```plaintext
class NoCoinState(VendingMachineState):
    def insert_coin(self, machine: 'VendingMachine') -> None:
        machine.set_state(HasCoinState())

class HasCoinState(VendingMachineState):
    def select_product(self, machine: 'VendingMachine') -> None:
        machine.set_state(DispenseState())
```

**Q:** What is the HelloInterview's overall warning about pattern usage in interviews?
Anchor: wrapping-up
**A:** Patterns only help when they match the problem being solved. Most interview-ready designs use no patterns, or at most one or two. Reaching for three or more patterns is a strong signal of forcing patterns and over-engineering.

## Introduction
Bucket: Concurrency
Link: https://www.hellointerview.com/learn/low-level-design/concurrency/intro

**Q:** When does concurrency typically show up in LLD interviews?
**A:** It depends on company, team, and level, but becomes common at senior levels, either as the core of the problem or as a follow-up once shared state exists.

- A classic LLD question can get harder, such as a parking lot where two cars race for the same spot
- Or the prompt is built around concurrency from the start, like thread pools, rate limiters, connection pools, or schedulers

*Note:* LLD concurrency is about threads and shared memory within a single process. Concurrency across multiple servers is a system design concern instead, covered under Dealing with Contention.

**Q:** What is the fundamental fact that concurrency problems stem from?
Anchor: concurrency-fundamentals
**A:** Threads within the same process share memory.

- A process is an isolated container with its own address space and resources
- A thread is an independent execution path with its own program counter, registers, and stack, but shares heap, globals, and open resources with other threads in the same process
- On multi-core machines threads may run in true parallel; on a single core the OS interleaves them, but from the program's perspective both cases look the same: unpredictable interleaving

**Q:** Why are concurrency bugs often nondeterministic and hard to reproduce?
Anchor: concurrency-fundamentals
**A:** Code that looks atomic at the source level is often multiple machine instructions underneath. If two threads read and write shared memory without coordination, the outcome depends on timing, scheduling, or load, which varies from run to run.

**Q:** Which mainstream languages are multi-threaded by default, and which is the notable exception?
Anchor: concurrency-fundamentals
**A:** Java, C++, Go, Rust, C#, and Python all run code concurrently with real shared-memory threads.

*JavaScript and TypeScript* are the exception: user code runs on a single main thread, with concurrency expressed through the event loop and async callbacks rather than shared-memory threads.

**Q:** What are atomics, and what is their key limitation?
Anchor: atomics
**A:** Thread-safe operations on a single variable without locks, implemented using CPU instructions like compare-and-swap (CAS) that complete in one uninterruptible step.

Limitation: they only protect a single variable. The moment two things need to be updated together, atomics stop being sufficient and you need a lock instead.

*Note:* Python lacks native atomics, so even a simple counter increment needs a lock.

```plaintext
lock = threading.Lock()
counter = 0
with lock:
    counter += 1  # Protected increment (Python lacks native atomics)
```

**Q:** What are locks (mutexes) and what are the three common variants?
Anchor: the-toolbox
**A:** Locks provide mutual exclusion. When a thread holds a lock, other threads trying to acquire it block until it's released, creating a critical section where only one thread executes at a time.

- **Coarse-grained** — one lock protects everything
- **Fine-grained** — separate locks per resource
- **Read-write** — allows multiple simultaneous readers, or one exclusive writer

Locks are the default tool for protecting shared state, especially for check-then-act and multi-field updates.

**Q:** What are semaphores and how do they differ from locks?
Anchor: semaphores
**A:** Counting locks with N permits instead of a binary locked/unlocked state. Threads acquire a permit before proceeding and release it when done; when permits hit zero, further threads block until one is released.

Use semaphores to limit concurrent operations, such as capping downloads at 5 or API calls at 10 simultaneously.

```plaintext
permits = threading.Semaphore(5)  # Allow 5 concurrent operations
permits.acquire()
try:
    do_work()
finally:
    permits.release()
```

**Q:** What are condition variables and what do they build?
Anchor: condition-variables
**A:** They let threads wait efficiently for a condition to become true. A thread acquires a lock, checks the condition, and if not satisfied, calls wait, which atomically releases the lock and puts the thread to sleep. When another thread signals, waiters wake and re-check.

Condition variables are the building block underneath blocking queues, but are rarely used directly in interviews.

**Q:** What are blocking queues and what problem do they solve?
Anchor: blocking-queues
**A:** A queue combined with condition variables to provide thread-safe producer-consumer handoff.

- Producers call `put()` to add items; if the queue is full, they block
- Consumers call `take()` to remove items; if the queue is empty, they block

The queue handles all synchronization internally, making it the go-to tool for handing work between threads.

```plaintext
q = queue.Queue(maxsize=100)
q.put(task)   # Blocks if queue is full
t = q.get()   # Blocks if queue is empty
```

**Q:** What are the three categories of concurrency problems in interviews?
Anchor: three-problem-types
**A:** **Correctness**, **Coordination**, and **Scarcity**.

- *Correctness* — shared state gets corrupted, such as two threads both checking a seat is available and both booking it
- *Coordination* — threads need to hand off work or wait for each other, such as a producer-consumer queue needing to block efficiently when empty or full
- *Scarcity* — resources are limited, such as 10 database connections serving 100 concurrent requests, forcing some to wait

**Q:** Which primitives map to which problem category?
Anchor: three-problem-types
**A:** - **Correctness** → locks, atomics, thread confinement — handles check-then-act and read-modify-write bugs
- **Coordination** → blocking queues, actors, event loops — handles async request processing and bursty traffic
- **Scarcity** → semaphores, resource pools — handles concurrent operation limits and resource reuse

Most interview questions start with correctness; coordination and scarcity often appear as follow-ups once shared state exists or throughput increases.

**Q:** What is the Python-specific caveat about threads and the GIL?
Anchor: language-reference
**A:** Python's GIL means CPU-bound code doesn't actually benefit from threads, since only one thread executes Python bytecode at a time. I/O-bound code does benefit from threads, since the GIL is released during I/O waits. For real CPU parallelism in Python, use multiprocessing instead of threading.

## Correctness
Bucket: Concurrency
Link: https://www.hellointerview.com/learn/low-level-design/concurrency/correctness

**Q:** What is a "correctness problem" in concurrency, and what's the underlying danger?
Anchor: the-problem
**A:** Preventing data corruption when multiple threads access shared state — two threads both booking the same seat, a counter that should read 1000 reading 847, a bank balance missing deposits.

The danger isn't deadlock or slow performance — it's **silently producing wrong results**. The check ("is this available?") and the action ("mark it taken") happen as separate steps, and another thread can invalidate the check between them.

**Q:** What are the four solutions to correctness problems, roughly in order of interview frequency?
Anchor: the-solutions
**A:** 1. **Coarse-grained locking** — one lock protects all related state
2. **Fine-grained locking** — separate locks per independent resource
3. **Atomic variables** — work for single variables, fail for multi-field invariants
4. **Thread confinement** — eliminates concurrency entirely by never sharing the data

**Q:** What is coarse-grained locking, and why is it the right default for most interview problems?
Anchor: coarse-grained-locking
**A:** One lock guards all related operations, so the check and the update happen together with no possibility of another thread interleaving between them.

```plaintext
def book_seat(self, seat_id: str, visitor_id: str) -> bool:
    with self._lock:
        if seat_id in self._seat_owners:
            return False
        self._seat_owners[seat_id] = visitor_id
    return True
```
It's the right default because critical sections triggered by a human (booking a seat, parking a car) are short and contention is moderate — even a wildly popular system with 10,000 users won't have more than a few dozen hitting the lock at the exact same microsecond.

> "I'll use a lock to ensure the check and booking happen atomically."

**Q:** What are the two most common mistakes when implementing coarse-grained locking?
Anchor: coarse-grained-locking
**A:** - **Releasing the lock too early** — locking only the check, releasing it, then performing the update outside the lock. This completely breaks atomicity, since another thread can act in the gap.
- **Using different lock objects** for operations that need to be atomic together — since separate locks don't coordinate with each other at all, this gives an *illusion* of protection with none of the actual safety.

*Rule:* all operations that maintain an invariant must be protected by the **same lock object**.

**Q:** What is a read-write lock, and when should you reach for one?
Anchor: read-write-locks
**A:** A lock with two modes: shared **read** mode (multiple threads can hold it simultaneously) and exclusive **write** mode (blocks everyone else until it completes). Useful when a workload is heavily skewed toward reads, like a cache or configuration store read thousands of times per update.

> "If reads dominate and writes are rare, I'd use a read-write lock so readers don't block each other. But if the ratio is close to 50/50, a simple mutex is usually faster."

If reads and writes are roughly equal, the overhead of the fancier lock can make it *slower* than a plain mutex.

**Q:** What is fine-grained locking, and what problem does it solve that coarse-grained locking can't?
Anchor: fine-grained-locking
**A:** Using multiple locks, each protecting a smaller, independent piece of state — e.g. one lock per seat instead of one lock for the entire venue. This lets unrelated operations (Alice booking 7A, Bob booking 12B) proceed in true parallel instead of queuing behind a single lock.

> "With coarse-grained locking we'd have contention issues at scale, so I'd use per-seat locks to allow concurrent bookings for different seats."

**Q:** What deadlock scenario can fine-grained locking introduce, and how is it fixed?
Anchor: fine-grained-locking
**A:** If an operation needs to lock two resources (e.g. swapping seats 7A and 12B), and two threads acquire those locks in *opposite order*, each ends up waiting on what the other is holding — permanent deadlock.

**Fix: consistent lock ordering.** Always acquire locks in the same defined order (e.g. by comparing seat IDs and locking the smaller one first), so no two threads can ever hold complementary halves of the same pair.

```plaintext
first = seat1 if seat1 < seat2 else seat2
second = seat2 if seat1 < seat2 else seat1

with self._get_lock(first):
    with self._get_lock(second):
        # ... perform swap
```

**Q:** What is the practical rule of thumb for choosing between coarse-grained and fine-grained locking in interviews?
Anchor: fine-grained-locking
**A:** If a **human** triggers the operation (booking a seat, parking a car), coarse-grained locking is almost always sufficient. Fine-grained locking matters when processing **machine-generated traffic at scale** — a connection pool handling thousands of queries per second, or a cache serving tens of thousands of requests per second.

**Q:** What are atomic variables, and what CPU primitive underlies them?
Anchor: atomic-variables
**A:** Special CPU instructions that perform read-modify-write operations in a single, uninterruptible step without a lock. The core primitive is **compare-and-swap (CAS)**: "set this variable to the new value, but only if it currently equals the expected value." If another thread changed the value first, the CAS fails and you retry.

This pattern is called **optimistic concurrency** — you assume no interference, do the work, and only retry if that assumption was wrong. Under low contention, most CAS attempts succeed on the first try, making atomics faster than acquiring a lock.

> "I'll use an atomic integer for the count since it's a single variable and atomics avoid lock overhead."

**Q:** What is the key limitation of atomic variables?
Anchor: atomic-variables
**A:** They only work for **single variables**. The moment two pieces of state need to stay consistent *with each other* (e.g. atomically booking two adjacent seats, 7A and 7B), atomics can't help — one update could succeed while the other fails, leaving an inconsistent state.

> Atomics are great for statistics. The moment you're enforcing a business rule, you're usually back to locks.

**Q:** What is thread confinement (shared nothing), and what's its tradeoff?
Anchor: thread-confinement
**A:** Instead of having threads compete for the same data, you partition the data so each thread owns its own slice exclusively — no sharing means no race condition is even possible. Example: Thread 1 handles venue sections A-M, Thread 2 handles N-Z, each with its own private seat map.

Tradeoff: you exchange *synchronization* complexity for *architectural* complexity. Operations spanning multiple partitions still need coordination, load imbalance can appear if some partitions run hotter than others, and confinement only works if strictly enforced.

> "If we're hitting lock contention limits, we could partition the data and assign each partition to a dedicated thread."

For most LLD interview problems, this is overkill — mention it only if the interviewer pushes hard on scalability.

**Q:** What is the "check-then-act" bug pattern, and what's the diagnostic question to ask?
Anchor: check-then-act
**A:** You check a condition, then act based on that check — the bug occurs when another thread invalidates the check between the read and the action. Appears in ticket booking, rate limiters, connection pools, LRU caches, file download managers, and parking lots.

Diagnostic question: **"Could another thread change this between when I check it and when I act on it?"** If yes, wrap both the check and the action in the same lock.

> "We're checking if the seat is available and then booking it, but another thread could book it between those two steps. I'll use a lock so the check and update happen together."

**Q:** What is the "read-modify-write" bug pattern, and how does it differ from check-then-act?
Anchor: read-modify-write
**A:** You read a value, compute something from it, and write the result back — there's no conditional branching, you always write. The bug is that two threads can read the *same* value, both compute from it, and both write back, silently **losing one update** (e.g. `count++` isn't atomic; it's read, add, write).

Difference from check-then-act: the danger here is a **lost update**, not acting on stale/invalid information. Appears in hit counters, bank account balances, metrics aggregators, and inventory systems.

> For a single variable: "I'll use an atomic integer since the increment operation is atomic." For multiple fields: "I'll use a lock so the read and write happen together."

**Q:** In the inventory "last t-shirt" example, why is it both check-then-act and read-modify-write combined?
Anchor: read-modify-write
**A:** Two buyers both read quantity as 1 (the check), both subtract 1 to get 0, both write 0 back. This oversells the item, since two shirts were sold but the quantity only decremented once. It requires a lock because you're checking quantity *before* decrementing it — the check-then-act half — while the decrement itself is also a read-modify-write operation that can lose an update on its own.

## Coordination
Bucket: Concurrency
Link: https://www.hellointerview.com/learn/low-level-design/concurrency/coordination

**Q:** What is a "coordination problem" in concurrency, and what three things does it require solving?
Anchor: the-problem
**A:** How threads communicate and hand off work — one thread produces tasks, another consumes them, and neither should burn CPU or corrupt state while waiting.

- **Efficient waiting** — consumers should sleep when there's no work, waking immediately when work arrives
- **Backpressure** — producers should slow down when consumers can't keep up, preventing memory exhaustion
- **Thread safety** — the coordination mechanism itself must handle concurrent access without corruption

**Q:** What are the two failure modes of naive waiting, and why does each fail?
Anchor: the-problem
**A:** - **Busy-waiting** — a tight loop constantly checking for work, burning 100% of a core doing nothing useful. With 8 workers on an 8-core machine, all compute capacity can be consumed just checking an empty queue.
- **Sleep-polling** — sleeping a fixed interval between checks. This trades wasted CPU for **added latency**: a task arriving 1ms after a worker sleeps might wait nearly the full sleep interval before being noticed.

**Q:** What happens when producers outpace consumers, and why is the delay itself not the real danger?
Anchor: the-problem
**A:** The queue grows faster than workers can drain it. If the queue is **unbounded**, it keeps accepting new tasks and growing, and since every queued task is an object consuming heap memory, this eventually causes an `OutOfMemoryError`.

The real danger isn't the processing delay — it's that an OOM crash **takes down the entire service**, not just background processing. The API goes down along with everything else.

**Q:** What are the two fundamentally different approaches to coordination?
Anchor: the-solutions
**A:** - **Shared state coordination** — multiple threads access the same data structure directly (e.g. a queue), synchronized with locks/condition variables
- **Message passing coordination** — avoids shared state entirely; each component has its own inbox and communicates only via messages (the actor model)

**Q:** What are condition variables, and what two things happen atomically when a thread calls wait()?
Anchor: shared-state-coordination
**A:** A low-level primitive letting a thread sleep until a condition becomes true, attached to a lock protecting the shared state.

1. The thread **releases the lock** and goes to sleep
2. The thread **stops consuming CPU entirely** — fully parked until explicitly woken

When another thread changes the state, it **signals** the condition variable; waiting threads must reacquire the lock before continuing.

```plaintext
with condition:
    while not condition_is_met():
        condition.wait()  # Releases lock, sleeps until notified
    do_work()
    condition.notify_all()  # Wakes all waiting threads
```

**Q:** Why must the condition check always be inside a `while` loop, never an `if`?
Anchor: shared-state-coordination
**A:** When a thread wakes from `wait()`, another thread might have already consumed whatever it was waiting for between being notified and reacquiring the lock. Some runtimes can also wake threads **spuriously**, with no `notify()` call at all. The `while` loop forces a recheck of the actual condition every time, rather than blindly trusting the wakeup.

**Q:** What is the tradeoff between `notify()` (wake one) and `notify_all()` (wake all), and what's the best fix?
Anchor: shared-state-coordination
**A:** Waking **one** thread risks waking the wrong kind of waiter — e.g. a consumer waiting on the same condition variable as producers might get woken when space frees up, even though it needs *items*, not space, wasting the wakeup.

Waking **all** threads fixes correctness but wastes context switches — if 50 threads wake and only one can actually proceed, 49 wake for nothing.

**Best fix: separate condition variables** — one for "not empty" (only consumers wait on it) and one for "not full" (only producers wait on it), so signals only wake the threads that could actually act on them.

**Q:** What is a blocking queue, and why is it the default interview answer for producer-consumer problems?
Anchor: blocking-queues
**A:** A thread-safe queue where `put()` blocks if full and `get()`/`take()` blocks if empty, using condition variables internally. It bundles backpressure (blocking producers when full) and efficient waiting (blocking consumers when empty) into one ready-made structure.

> "I'll use a blocking queue so consumers wait efficiently and the synchronization is handled for me."

```plaintext
self._queue = queue.Queue(maxsize=1000)

def submit_task(self, task):
    self._queue.put(task)  # Blocks if queue is full

def worker_loop(self):
    while True:
        task = self._queue.get()  # Blocks if queue is empty
        task()
```

**Q:** What is the single biggest mistake with blocking queues, and how should capacity be chosen?
Anchor: blocking-queues
**A:** Creating an **unbounded queue** — this reintroduces the memory exhaustion problem from the intro.

*Capacity sizing rule of thumb:* size the buffer for expected burst tolerance. If workers handle 100 tasks/sec and you want to absorb a 10-second spike without blocking producers, you need a buffer of roughly 1,000 tasks.

**Q:** What are the three options when a blocking queue fills up, and when should each be used?
Anchor: blocking-queues
**A:** - **Block producers** (`put()`) — for internal pipelines where slowing down is acceptable, like a batch job feeding a processing stage
- **Timeout and reject** (`offer(timeout)`) — for request paths where stalling isn't acceptable; return a 503 or "try again later" to the user
- **Drop and log** (`offer()`, no timeout) — for lossy workloads like analytics events, where dropping under load is acceptable

**Q:** What is the correct way to handle InterruptedException from a blocked put()/take() call, and what's the worst thing you can do?
Anchor: blocking-queues
**A:** Either let the exception **propagate up** by declaring it in the method signature, or if you must catch it, **restore the interrupt status** with `Thread.currentThread().interrupt()` so code further up the stack still knows the thread was interrupted.

The worst thing you can do is **catch it and silently ignore it** — that swallows the signal that someone is trying to stop the thread.

**Q:** What are the three approaches to gracefully shutting down workers blocked in take()?
Anchor: blocking-queues
**A:** - **Interrupt the worker threads** — a thread blocked in `take()` wakes and throws `InterruptedException`, which the worker catches to break its loop and exit cleanly
- **Poll with a timeout** — instead of blocking forever, `poll(timeout)` returns null if nothing shows up, giving the worker a chance to periodically check a shutdown flag
- **Poison pill pattern** — submit a special sentinel task per worker; each worker processes normally until it pulls the sentinel, then exits its loop. Useful when threads can't be interrupted or timeouts aren't wanted.

**Q:** What is the actor model, and what three properties define an actor?
Anchor: the-actor-model
**A:** A message-passing coordination approach where independent units of computation communicate without any shared state.

1. It has a **mailbox** — a queue of incoming messages
2. It **processes messages one at a time**
3. It can **send messages** to other actors

Because messages are processed sequentially, an actor's internal state never faces concurrent access — no locks needed within the actor's own logic.

**Q:** Why don't you need locks inside an actor's message handler, but the mailbox itself still needs synchronization?
Anchor: the-actor-model
**A:** The actor processes one message at a time, so its own handler logic never runs concurrently with itself — any mutable state it owns is accessed sequentially, with no synchronization needed in the business logic.

The **mailbox** still needs internal synchronization, though, since multiple *other* threads/actors might call `send()` concurrently — that queue (often a blocking queue) handles the concurrent writes internally.

**Q:** When should you reach for actors instead of a plain blocking queue?
Anchor: when-to-use-actors
**A:** When the problem is **"coordinate many independent entities with their own state"** rather than simply **"process these tasks in the background."**

- Good fit: chat systems (each user session is an actor), game servers (each room/player is an actor), trading systems (each order book is an actor)
- Poor fit: simple producer-consumer handoff — a blocking queue is simpler and more direct, and actors add conceptual overhead (message types, lifecycles, delivery guarantees) without benefit

> "Another approach is the actor model, where each entity processes its own messages sequentially. That eliminates shared state within each actor."

**Q:** What are the four challenges specific to the actor model?
Anchor: when-to-use-actors
**A:** - **Mailbox overflow** — mailboxes can fill up just like queues if producers outpace an actor's processing rate
- **Message ordering** — messages from a single sender to a single actor arrive in order, but interleaving across *multiple* senders to the same actor is undefined
- **Debugging difficulty** — bugs can be in how messages flow between actors rather than in any single piece of code, harder to trace than a single call stack
- **Request-response patterns** — actors communicate asynchronously by default, so waiting for a reply requires manually building a callback/reply pattern (some frameworks provide an "ask" pattern to hide this)

**Q:** What is the "process requests asynchronously" pattern, and what's the concrete benefit demonstrated by the email signup example?
Anchor: process-requests-asynchronously
**A:** The most common coordination pattern in interviews: an API handler does the minimum work needed to respond to a user, then hands off slow work (sending an email, resizing an image) to a background queue, returning immediately.

*Benefit:* the signup handler saves the user and enqueues an email task, both fast operations, so the whole request takes milliseconds. If the email service is slow or entirely down, the worker blocks or retries — but the user already got their success response and never notices.

> "I'll use a blocking queue to decouple the API from the background work. The handler enqueues tasks and returns immediately. Workers process asynchronously."

**Q:** What is the "handle bursty traffic" pattern, and why is scaling workers to peak load the wrong solution?
Anchor: handle-bursty-traffic
**A:** Load arrives in unpredictable waves — a news spike, a Black Friday surge, a ticket sale rush — rather than steadily.

Scaling workers to match peak load (e.g. 1,000 workers for a 10,000 req/s spike) means those workers sit **idle 99% of the time**, wasting money on unused capacity.

*Better solution:* size workers for **normal load** and let a bounded queue absorb the burst. Requests pile up temporarily; workers churn through them at their sustainable rate; the queue drains after the burst ends — smoothing a 100x spike into steady processing.

> "I'll use a blocking queue to buffer requests during bursts. Workers process at a steady rate, and the queue smooths the spike. I'll size the queue based on expected burst duration and peak rate."

## Scarcity
Bucket: Concurrency
Link: https://www.hellointerview.com/learn/low-level-design/concurrency/scarcity

**Q:** What is a "scarcity problem" in concurrency, and how does it differ from a correctness problem?
Anchor: the-problem
**A:** Managing **limited resources** when demand exceeds supply — you have 5 connections and 100 requests, so most must wait. Unlike correctness problems, there's no data corruption risk; the danger is a request holding a resource forever (bug or slow query), which blocks everyone else even though the underlying system is healthy.

> "This isn't a correctness issue, it's a capacity issue — I need to manage waiting without the system falling over."

**Q:** When do you reach for a semaphore vs. a blocking queue?
Anchor: semaphores
**A:** **Semaphore** when you're only limiting *how many* operations run concurrently and there's no actual object to hand out (e.g. API rate limiting). **Blocking queue** when you need to hand out *specific stateful objects* (e.g. connection objects with open sockets).

> "A semaphore caps concurrency, but where would the actual Connection objects live? That's what the queue solves."

**Q:** How does a semaphore work, and what's the interview-safe answer for "how does it actually block threads?"
Anchor: semaphores
**A:** A counter initialized with N permits. `acquire()` decrements it, blocking if it hits zero; `release()` increments it, waking a waiting thread. Don't explain OS internals — say it uses OS primitives to park/wake threads and let the language's Semaphore implementation handle it.

```python
class APIClient:
    def __init__(self):
        self._semaphore = threading.Semaphore(5)

    def make_request(self, endpoint):
        with self._semaphore:
            return self._http_client.get(endpoint)
```

**Q:** What's the #1 bug interviewers test for with semaphore/pool code, and how do you avoid it?
Anchor: semaphores
**A:** Forgetting to **release the permit/resource in a finally block**. If an exception is thrown mid-operation without release, the permit leaks forever and eventually the whole pool hangs.

> "I'll wrap the acquire and release in a try/finally so a failed operation still frees the resource."

**Q:** How do you limit aggregate consumption (e.g. total MB in flight) instead of operation count?
Anchor: limit-aggregate-consumption
**A:** Use a semaphore where **each permit represents one unit of the resource** (e.g. 1 permit = 1MB). Acquire permits equal to the size of what you're consuming, release them when done. This differs from limiting concurrent ops because operations have variable sizes, not a fixed count.

```python
permits = max(1, (len(data) + MB - 1) // MB)
# acquire `permits`, do the write, release `permits`
```

**Q:** Does a semaphore-based bandwidth/memory limiter give you true rate limiting?
Anchor: limit-aggregate-consumption
**A:** No — it limits **concurrent units in flight**, not a rate over time. True rate limiting (e.g. 100MB/s) needs a time-based algorithm like a **token bucket**, where permits replenish at a fixed rate rather than being a static pool.

**Q:** Why can't a semaphore alone solve the connection-pool problem?
Anchor: resource-pooling-with-queue
**A:** A semaphore only limits *how many* threads can proceed; it doesn't track *which specific object* each thread gets. A **blocking queue** holds the actual reusable objects — threads `take()` one, use it, and `put()` it back.

```python
class ConnectionPool:
    def __init__(self, pool_size):
        self._pool = queue.Queue(maxsize=pool_size)
        for _ in range(pool_size):
            self._pool.put(self._create_connection())

    def acquire(self):
        return self._pool.get()  # blocks if empty

    def release(self, conn):
        self._pool.put(conn)
```

**Q:** What's the most common mistake when building a blocking-queue resource pool, and why is it dangerous?
Anchor: resource-pooling-with-queue
**A:** Creating an **unbounded queue** (e.g. no maxsize argument). If connections are created on demand and never capped, the queue can grow forever, exhausting the database or memory — always pass an explicit capacity matching the pool size.

**Q:** Should a resource pool be initialized upfront or lazily, and what's the default interview answer?
Anchor: resource-pooling-with-queue
**A:** Default to **upfront** — create all objects in the constructor. It's simpler, avoids lazy-init race conditions, and gives predictable performance once running. Only go lazy if the interviewer specifically flags startup time as a concern.

> "I'll create all connections in the constructor — simpler, avoids races, and predictable once running."

**Q:** Why is blocking forever (`take()`) on a resource pool dangerous in a request path?
Anchor: resource-pooling-with-queue
**A:** If all resources are stuck (e.g. a slow query holding a connection), the thread blocks indefinitely even after the upstream caller or load balancer has already given up — the user sees a timeout while your thread sits stuck holding nothing.

**Q:** What's the fix for indefinite blocking when acquiring a pooled resource?
Anchor: resource-pooling-with-queue
**A:** Use the **timeout variant** (`poll(timeout)` instead of `take()`). If the timeout expires, raise/return an error (e.g. 503) instead of blocking forever, so the caller fails fast rather than hanging.

```python
def acquire(self):
    try:
        return self._pool.get(timeout=self._timeout)
    except queue.Empty:
        raise RuntimeError(f"No connection available within {self._timeout}s")
```

**Q:** How do you pick a timeout value for resource acquisition?
Anchor: resource-pooling-with-queue
**A:** Base it on expected operation time plus a buffer — e.g. queries run ~100ms, set a ~500ms timeout. Too short fails requests that would've succeeded; too long leaves callers waiting past their own deadline. Stay well under any upstream load balancer or client timeout.

**Q:** A connection pool shows all connections "in use" but DB throughput is low — what's actually happening, and what's the fix?
Anchor: maximize-utilization
**A:** Uneven task duration — a few slow operations hold connections for hundreds of ms while fast ones finish in 1ms, so reported utilization doesn't reflect actual work being done. Fix with **work stealing** (per-worker queues where idle workers steal from busy ones) so no single slow task stalls the whole pool.

> "If task durations vary wildly, I'd use work stealing so idle workers pull from busier queues instead of sitting idle."

**Q:** What are batching and adaptive sizing, and when do you reach for them over basic pooling?
Anchor: maximize-utilization
**A:** **Batching** amortizes per-operation coordination cost by grouping many small operations under one acquire/release (trades latency for throughput). **Adaptive sizing** grows/shrinks the pool based on demand (e.g. HikariCP, pgbouncer) instead of a fixed size. Reach for these only when the interviewer pushes on *throughput*, not just correctness/capping.
