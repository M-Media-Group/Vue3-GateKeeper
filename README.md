# The gate logic
This starter kit comes with an opinionated gate handler. It allows you to protect routes and actions using gates defined in a single place.

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
class isAuthenticated extends baseGate {

  async handle() {
    if (!user.isAuthenticated) {
      return this.fail();
    }
  }

}

const gate = new isAuthenticated();

export default (options: any) => {
  return gate.setOptions(options).handle();
};

```

Now, whenever someone tries to access the route, the gate will be executed. If the user is authenticated, the gate will not return anything and the request will pass. If the user is not authenticated, the gate will return `false`.

If you want to redirect to a specific page, you can override the `route` function in your middleware. If you return `false`, the navigation will be cancelled instead of redirected.

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
const GateKeeper = inject('gateKeeper');

const isAuthenticated = async () => {
    const result = await GateKeeper(['isAuthenticated']).handle();

    // GateKeeper returns a result only if a gate fails.
    if (result) {
        return false;
    }

    // If there is no result, all gates have passed.
    return true;
}
```

### Installation
```bash
npm install --save @m-media/vue3-gate-keeper
```

In your main file, add the gate plugin.

```javascript
import { gateKeeper } from "vue3-gatekeeper";

app.use(
  gateKeeper,
  {
    gatesFolder: "/src/gates",
  },
  router
);
```

The `gatesFolder` option is the path to the folder where you will store your gates. The default is `/src/gates`. The third parameter is an optional router instance. If you don't pass a router instance, route-level gates will not be enabled.

## More examples
Imagine we want to prevent a user action based on if they have enough kittens (we'll consider 5 to be enough in this case).

First, we'd define a gate that checks if the user has enough kittens. If they do not, it should return `fail()`.

We'll call our gate `userHasKittens` and extend the `baseGate` class. Finally, we'll put it in the `router/gates` folder.

We'll also define the `form` to be used in case the gate fails. In this case, we want the user to add kittens, so we will return the `AddKittens` form.

```javascript
import baseGate from "./baseGate";

class userHasKittens extends baseGate {

  // The form is what the user will see if the gate fails
  form = "AddKittens";

  // This is the core action of the gate. It determines if the gate passes or a form should be displayed
  async handle() {
    if (user.kittens.length < 5) {
      return this.fail();
    }
  }
}

// This is our gate instance. Defining only one is OK in this case - its not subject to change so a "singleton type" approach works in our favor.
const gate = new userHasKittens();

// Finally we export the gate so that it can be used by our handler. Our handler will pass it options, so we must make sure to set them before running the gate itself
export default (options) => {
  return gate.setOptions(options).handle();
};
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
const result = await GateKeeper(['isAuthenticated', 'userHasKittens']).handle();
```

## The gate class

The gate class defines the logic of your gate.

### Properties
#### form: string | false
The form element to use in order to make this gate pass. You should either pass a string to a form name (filename) of a form in `/src/forms/`, or `false` if no form exists.

Note that gate that return `false` will not continue any navigation or logic - it is essentially a "cancel" event. Because of this, you should also define the `route` function so that users attempting to access a page directly do not see a blank page.

### Functions

#### handle: fail() | undefined
The main gate handler. If the gate should NOT pass, then you should return `this.fail()`, otherwise, do not return anything.

#### route: RouteLocationRaw | false
This function is optional.

If not defined and the gate is intercepted by a route request, it will be redirected to the path `/confirm/:form()` where `:form()` is the name of the form to use. That route will automatically resolve and display the form, and then continue the navigation once the form is completed.

If you would like to redirect elsewhere, you should override the `route` function in your gate and return a `RouteLocationRaw`.

#### setOptions
You should not override this function. It sets the options available to the gate. This function should be called before you call the `handle()` function.

## The gate handler
The gate handler is already set up for you for the Router and in the `ConfirmsGate` component.

The gate handler itself takes an array of gate names and runs through each of them. As a second parameter, you can pass in optional options. Calling the `handle()` function will execute all the gates passed to the handler.

```javascript
const response = await new GateKeeper(['auth', 'userHasKittens']).handle();
```

If all gates pass, the response will be `undefined`. If the gate should stop execution, it will return `false`. If you pass an instance of `RouteLocationNormalized` to the `options`, the handler will automatically detect that it should respond with a redirect if it fails. Otherwise, it will return a `string` containing the name of the form to display.