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
    - [Changing route behavior](#changing-route-behavior)
    - [Advanced usage in a component example](#advanced-usage-in-a-component-example)
  - [GateKeeper in detail](#gatekeeper-in-detail)
    - [Properties](#properties)
      - [form: string | false](#form-string--false)
    - [Functions](#functions)
      - [handle: fail() | undefined](#handle-fail--undefined)
      - [route: RouteLocationRaw | false](#route-routelocationraw--false)
  - [GateKeeper](#gatekeeper)

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

Define the gate by creating a file with a class that extends `baseGate`. The `handle` function should return `this.fail()` if the gate should not pass, otherwise don't return anything.

```typescript
export default class extends baseGate {
  async handle() {
    if (!user.isAuthenticated) {
      return this.fail();
    }
  }
}
```

Finally, import the gate in your `main.ts` file and register it.

```typescript
import isAuthenticated from "./gates/isAuthenticated";

app.use(GateKeeper, {
  gates: {
    isAuthenticated,
  },
  router,
});
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

We can also run GateKeeper in a component (for example, to prevent a form submission if the gates don't pass). In this case, we can inject `gateKeeper` and use its functions.

```typescript
import { useGateKeeper } from "@m-media/vue3-gate-keeper";

const GateKeeper = useGateKeeper();

const isAuthenticated = async () => {
  const result = await GateKeeper(["isAuthenticated"]).handle();

  // GateKeeper returns a result only if a gate fails. You can see which gate failed by checking the result.gate property.
  if (result) {
    console.log(`Gate ${result.gate} returned the following:`, result.data);
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
// main.js
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

The `gateInstances` option takes references to each of your gates. GateKeeper will automatically instantiate each gate class, only once, as needed. If you end up with a lot of gates you could create a `index` file that imports all of your gates and exports them as an object.

```javascript
// src/gates/index.ts
import isAuthenticated from "./gates/isAuthenticated";
import isAuthorized from "./gates/isAuthorized";

export default {
  isAuthenticated,
  isAuthorized,
};
```

Then, in your main file, you can import all the gates and pass them to GateKeeper.

```javascript
// src/main.ts
import gates from "./gates";

app.use(
  gateKeeper,
  {
    gateInstances: gates,
  },
  router
);
```

## More examples

Imagine we want to prevent a user action based on if they have enough kittens.

First, we'd define a gate that checks if the user has enough kittens. If they do not, it should return `fail()`.

Our gate should extend the `baseGate` class.

<!-- We'll also define the `form` to be used in case the gate fails. In this case, we want the user to add kittens, so we will return the `AddKittens` form. -->

```javascript
import { baseGate } from "@m-media/vue3-gate-keeper";

export default class extends baseGate {
  // This is the core action of the gate. It determines if the gate passes or a form should be displayed
  async handle() {
    if (user.kittens.length < (this.options.gateOptions?.minimumKittens ?? 3)) {
      return this.fail();
    }
  }
}
```

The gate is defined and ready to be used. You'll notice we're using `this.options.gateOptions.minimumKittens` to get the minimum number of kittens. We'll see how to pass this option a [little further down](#passing-options-to-the-gate).

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
                minimumKittens: 5,
            },
        },
      ... // More gates, if you want
      ],
    },
  },
```

In our gate class, we can access the passed options by using `this.options.gateOptions`.

```javascript
this.options.gateOptions.minimumKittens; // 5
```

Of course, you can use the same syntax when calling GateKeeper yourself:

```javascript
const result = await GateKeeper([
  "isAuthenticated", // We can use other gates just like before
  {
    name: "userHasKittens", // This is the name of the gate to use
    options: {
      minimumKittens: 5,
    },
  },
]).handle();
```

### Changing route behavior

By default, GateKeeper will cancel the navigation if the gate fails. If you want to change this behavior, you can override the `route` function in your gate.

```javascript
  route() {
    return {
      name: "login",
    };
  }
```

GateKeeper will automatically add the `redirect` query parameter to the route, which contains the `fullPath` of the intercepted path. This way, you can redirect the user back to the page they were trying to access originally once they have logged in. If you do not want to generate a redirect query parameter, you should pass the `setRedirectToIntended: false` in the route response.

```javascript
  route() {
    return {
      name: "login",
      setRedirectToIntended: false,
    };
  }
```

### Advanced usage in a component example

See the component here: https://github.com/M-Media-Group/Vue3-SPA-starter-template/blob/master/src/components/modals/ConfirmsGate.vue#L34 which demonstrates using GateKeeper to show a modal with a form if any gate fails, asking the user to confirm the action and/or fill in missing information, and then re-running the gates until all pass.

## GateKeeper in detail

The gate class defines the logic of your gate by extending baseGate.

### Properties

#### form: string | false

This parameter is optional.

The form parameter is what is returned by the gate if it fails and the current request is not a route navigation. This is a great place to return the name of a form component that you want to display to the user, so that when calling GateKeeper in a component, you can display a form to the user to fill in missing information or confirm the action.

Note that gates that return `false` will not continue any navigation or logic - it is essentially a "cancel" event. Because of this, you should also define the `route` function so that users attempting to access a page directly do not see a blank page.

### Functions

#### handle: fail() | undefined

The main GateKeeper. If the gate should NOT pass, then you should return `this.fail()`, otherwise, do not return anything.

#### route: RouteLocationRaw | false

This function is optional.

If not defined and the gate is intercepted by a route request, it will be redirected to the path `/confirm/:form()` where `:form()` is the name of the form to use. That route will automatically resolve and display the form, and then continue the navigation once the form is completed.

If you would like to redirect elsewhere, you should override the `route` function in your gate and return a `RouteLocationRaw`.

## GateKeeper

GateKeeper is already set up for you in the Router.

GateKeeper itself takes an array of gate names and runs through each of them. Calling the `handle()` function will execute all the gates passed to the handler.

```typescript
import { useGateKeeper } from "@m-media/vue3-gate-keeper";

const GateKeeper = useGateKeeper();

const response = await new GateKeeper(["auth", "userHasKittens"]).handle();
```

If all gates pass, the response will be `undefined`. If the gate should stop execution, it will return `false`. If you pass an instance of `RouteLocationNormalized` to the `options`, the handler will automatically detect that it should respond with a redirect if it fails. Otherwise, it will return a `string` containing the name of the form to display.
