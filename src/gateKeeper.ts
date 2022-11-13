/** This file defines a gate handler that can handle multiple gates in a given route, navigating to each one until all pass */

import type {
  RouteLocationNormalized,
  RouteLocationRaw,
  Router,
} from "vue-router";
import { gatekeeperKey } from "./useGateKeeper";

export interface Gate {
  name: string;
  options?: GateOptions | Record<string, any>;
}

export interface GateOptions {
  routeData?: RouteLocationRaw | RouteLocationNormalized;
  gateOptions?: Record<string, any>;
}

/**
 * A class that handles the gates of the coming request.
 *
 * @export
 * @class GateKeeper
 */
export class GateKeeper {
  /**
   * Our gates that will be handled during the request
   *
   * @type {RouteLocationNormalized}
   * @memberof GateKeeper
   */
  gates = [] as Gate[];

  gateInstances: any;

  gateClasses = [] as Record<string, any>;

  /**
   * Our "request" object - the route that the request is going to
   *
   * @type {(any | null)}
   * @memberof GateKeeper
   */
  routeData: any | null;

  constructor(
    gates: string | (string | Gate)[] | Gate,
    gateInstances = null as any | null,
  ) {
    this.setGates(gates);

    if (gateInstances)
    {
      this.gateInstances = gateInstances;
    }
  }

  /**
   *Convert a potentially singular type gate to an array
   *
   * @private
   * @param {(string | Gate | (string | Gate)[])} gate
   * @return {*}
   * @memberof GateKeeper
   */
  private convertSingularGateToArray(
    gate: string | Gate | (string | Gate)[]
  ) {
    return Array.isArray(gate) ? gate : [gate];
  }

  /**
   * Convert a potential string into a gate object
   *
   * @private
   * @param {(string | Gate)} gate
   * @return {*}
   * @memberof GateKeeper
   */
  private convertStringGateToObject(gate: string | Gate) {
    return typeof gate === "string" ? { name: gate } : gate;
  }

  /**
   * Set the gate to use during the request
   *
   * @param {(string | (string | Gate)[] | Gate)} gates
   * @return {*}
   * @memberof GateKeeper
   */
  setGates(gates: string | (string | Gate)[] | Gate) {
    gates = this.convertSingularGateToArray(gates);

    const newGates = [] as Gate[];

    gates.forEach((gate) => {
      gate = this.convertStringGateToObject(gate);
      newGates.push(gate);
    });

    this.gates = newGates;

    return this;
  }

  /**
   * Get the gates that are loaded and ready to be parsed/ran through
   *
   * @return {*}
   * @memberof GateKeeper
   */
  getGates() {
    return this.gates;
  }

  /**
   * Get an array of gate names that are ready to be parsed/ran
   *
   * @return {*}
   * @memberof GateKeeper
   */
  getGateNames() {
    return this.gates.map((gate) => gate.name);
  }

  /**
   * Set route data
   *
   * @param {*} [routeData=null as RouteLocationNormalized | RouteLocationRaw | null]
   * @return {*}
   * @memberof GateKeeper
   */
  setRouteData(
    routeData = null as RouteLocationNormalized | RouteLocationRaw | null
  ) {
    this.routeData = routeData;
    return this;
  }

  private addOrGetGateClass(name: string, gateClass: any){
    if (!this.gateClasses[name]) {
      this.gateClasses[name] = new gateClass();
    }
    return this.gateClasses[name];
  }

  /**
   * Handle a gate given its name. It will import the gate and then run its default export function
   *
   * @param {string} name
   * @return {*}
   * @memberof GateKeeper
   */
  private handleGate(name: string, options: any) {
    // If the gate by the given name is in gateInstances, we can just use that
    if (this.gateInstances && this.gateInstances[name]) {
      this.addOrGetGateClass(name, this.gateInstances[name]);
    }

    if (!this.gateClasses[name]) {
      throw new Error(
        `Gate ${name} does not exist. Please make sure it is imported and added to the gateInstances object.`
      );
    }

    return this.gateClasses[name].setOptions(options).handle(options);
  }

  private loadGateFromGateKeeper(name: string, options: any) {
        return import(`./gates/${name}.ts`).then((gate) => {
      // Add the gate to gateInstances so we don't have to import it again
      if (this.gateInstances && !this.gateInstances[name]) {
        this.gateInstances[name] = gate.default;
        this.addOrGetGateClass(name, this.gateInstances[name]);
      }
      return this.gateClasses[name].setOptions(options).handle(options);
    });
  }

  /**
   * Run the gate handler. This will look at all the gates for the given route, and run them one by one. If a gate redirects (e.g. prevents access), then the user will be redirected according to the gate and the next gates will not run
   *
   * @return {*}
   * @memberof GateKeeper
   */
  async handle() {
    // If there are no gates to run, just continue
    if (!this.gates) {
      return;
    }

    for (const gate of this.gates) {
      // Setup the result that we will send back
      const result = {
        gate: gate.name,
        data: undefined as any,
      };

      // Handle the gate and return its data, if it returns any
      result.data = await this.handleGate(gate.name, {
        routeData: this.routeData,
        gateOptions: gate.options,
      });

      // If the gate returned something, it means that we're going to the gate intercepted route instead
      if (result.data !== undefined) {
        // If the result is false, we cancel the navigation
        if (result.data === false) {
          return result;
        }

        // We should set a reference to the intended page in the URL so we can redirect there after the gate that intercepted the request is satisfied. Some gates may not want this behaviour (e.g. if you're authenticated but trying to visit a guest only page (like login), you don't want to set a redirect to login in the URL as it makes no sense)
        if (
          result.data.setRedirectToIntended !== false &&
          this.routeData?.fullPath
        ) {
          result.data.query = {
            redirect: this.routeData.fullPath,
          };
        }

        return result;
      }
    }
  }
}

/**
 * The function to setup the gate handler for a vue router
 * @param router
 */
export const setupGateRouterHandler = (
  gate: GateKeeper,
  router: Router
) => {
  router.beforeEach(async (to: RouteLocationNormalized) => {
    if (!to.redirectedFrom && to.query.redirect) {
      return to.query.redirect;
    }

    gate.setGates((to.meta.gates as string[]) || []);
    gate.setRouteData(to);

    const response = await gate.handle();

    if (response && "data" in response) {
      return response.data;
    }
  });
};

/**
 * Our Vue3 gate plugin
 */
export const gatePlugin = {
  install(app: any, options: any, router?: Router) {
    const gate = new GateKeeper([], options?.gateInstances);

    const runGates = (gates: any) => {
      return gate.setGates(gates);
    };

    app.provide(gatekeeperKey, runGates);

    if (router) {
      // We pass a new, separate instance of the GateKeeper so that the routeData set later is independent
      setupGateRouterHandler(
        new GateKeeper([], options?.gateInstances),
        router
      );
    }
  },
};
