# Vue3 GateKeeper

Add gates to allow or deny requests in your Vue3 app and Vue Router!

## Table of contents

- [Vue3 GateKeeper](#vue3-gatekeeper)
  - [Table of contents](#table-of-contents)
  - [Quick usage](#quick-usage)
  - [Installation](#installation)
  - [More examples](#more-examples)
    - [Using multiple gates](#using-multiple-gates)
    - [Passing options to the gate](#passing-options-to-the-gate)
  - [GateKeeper in detail](#gatekeeper-in-detail)
    - [Properties](#properties)
      - [form: string | false](#form-string--false)
    - [Functions](#functions)
      - [handle: fail() | undefined](#handle-fail--undefined)
      - [route: RouteLocationRaw | false](#route-routelocationraw--false)
      - [setOptions](#setoptions)
  - [GateKeeper class](#gatekeeper-class)

## Quick usage

In a route, define the `meta.gates` array.

```javascript
 {
    ..., // other route properties
    meta: {
      gates: ["isAuthenticated"],
    },
  },
```

Define the gate in `src/gates/isAuthenticated.ts` by creating a class with the same name that extends `baseGate`. The `handle` function will return a `fail()` if the gate should not pass, otherwise it returns nothing.

```typescript
export default class extends baseGate {
  async handle() {
    if (!user.isAuthenticated) {
      return this.fail();
    }
  }
}
```

Now, whenever someone tries to access the route, the gate will be executed. If the user is authenticated, the gate will not return anything and the request will pass. If the user is not authenticated, the gate will return `false`.

If you want to redirect to a specific page, you can override the `route` function in your gate. If you return `false`, the navigation will be cancelled instead of redirected.

```typescript
  route(): false | RouteLocationRaw {
    return {
      name: "login",
    };
  }
```

GateKeeper will redirect the user to the login page and automatically add the `redirect` query parameter. This way, you can redirect the user back to the page they were trying to access originally once they have logged in.

We can also run GateKeeper in a component. In this case, we can inject `gateKeeper` and use its functions.

```typescript
import { useGateKeeper } from "@m-media/vue3-gate-keeper";

const GateKeeper = useGateKeeper();

const isAuthenticated = async () => {
  const result = await GateKeeper(["isAuthenticated"]).handle();

  // GateKeeper returns a result only if a gate fails.
  if (result) {
    return false;
  }

  // If there is no result, all gates have passed.
  return true;
};
```

## Installation

```bash
npm install --save @m-media/vue3-gate-keeper
```

In your main file, add the gate plugin.

```javascript
import { gateKeeper } from "vue3-gatekeeper";
import isAuthenticated from "./gates/isAuthenticated";

app.use(
  gateKeeper,
  {
    gateInstances: {
      isAuthenticated: isAuthenticated,
    },
  },
  router
);
```

The `gateInstances` option takes references to each of your gates. GateKeeper will automatically instantiate each gate as needed.

## More examples

Imagine we want to prevent a user action based on if they have enough kittens (we'll consider 5 to be enough in this case).

First, we'd define a gate that checks if the user has enough kittens. If they do not, it should return `fail()`.

We'll call our gate `userHasKittens` and extend the `baseGate` class. Finally, we'll put it in the `src/gates` folder.

<!-- We'll also define the `form` to be used in case the gate fails. In this case, we want the user to add kittens, so we will return the `AddKittens` form. -->

```javascript
import baseGate from "./baseGate";

export default class extends baseGate {
  // The form is what the user will see if the gate fails
  form = "AddKittens";

  // This is the core action of the gate. It determines if the gate passes or a form should be displayed
  async handle() {
    if (user.kittens.length < 5) {
      return this.fail();
    }
  }
}
```

The gate is defined and ready to be used.

### Using multiple gates

You can chain as many gates as you want. If one fails, its response will be returned and no further gates will be evaluated.

```javascript
 {
    ..., // other route properties
    meta: {
      gates: ["isAuthenticated", "userHasKittens"],
    },
  },
```

Or, in a component:

```javascript
const result = await GateKeeper(["isAuthenticated", "userHasKittens"]).handle();
```

### Passing options to the gate

You can pass options to a given gate by passing it as an object with the keys `name` and `options`, where the name is the gate you want to use and the options are your custom options.

```javascript
 {
    ..., // other route properties
    meta: {
      gates: [
        {
            name: "userHasKittens", // This is the name of the gate to use
            options: {
                kittens: 5,
            },
        },
      ... // More gates, if you want
      ],
    },
  },
```

In our gate class, we can access the passed options by using `this.options.gateOptions`.

```javascript
this.options.gateOptions.kittens; // 5
```

Of course, you can use the same syntax when calling GateKeeper yourself:

```javascript
const result = await GateKeeper([
  "isAuthenticated", // We can use other gates just like before
  {
    name: "userHasKittens", // This is the name of the gate to use
    options: {
      kittens: 5,
    },
  },
]).handle();
```

## GateKeeper in detail

The gate class defines the logic of your gate by extending baseGate.

### Properties

#### form: string | false

The form element to use in order to make this gate pass. You should either pass a string to a form name (filename) of a form in `/src/forms/`, or `false` if no form exists.

Note that gate that return `false` will not continue any navigation or logic - it is essentially a "cancel" event. Because of this, you should also define the `route` function so that users attempting to access a page directly do not see a blank page.

### Functions

#### handle: fail() | undefined

The main GateKeeper. If the gate should NOT pass, then you should return `this.fail()`, otherwise, do not return anything.

#### route: RouteLocationRaw | false

This function is optional.

If not defined and the gate is intercepted by a route request, it will be redirected to the path `/confirm/:form()` where `:form()` is the name of the form to use. That route will automatically resolve and display the form, and then continue the navigation once the form is completed.

If you would like to redirect elsewhere, you should override the `route` function in your gate and return a `RouteLocationRaw`.

#### setOptions

You should not override this function. It sets the options available to the gate. This function should be called before you call the `handle()` function.

## GateKeeper class

GateKeeper is already set up for you in the Router.

GateKeeper itself takes an array of gate names and runs through each of them. Calling the `handle()` function will execute all the gates passed to the handler.

```javascript
const response = await new GateKeeper(["auth", "userHasKittens"]).handle();
```

If all gates pass, the response will be `undefined`. If the gate should stop execution, it will return `false`. If you pass an instance of `RouteLocationNormalized` to the `options`, the handler will automatically detect that it should respond with a redirect if it fails. Otherwise, it will return a `string` containing the name of the form to display.
