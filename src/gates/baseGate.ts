import type { RouteLocationRaw } from "vue-router";
import type { GateOptions } from "../gateKeeper";

/**
 * The base gate abstract class, which all other gates should extend.
 *
 * @abstract
 * @class baseGate
 */
abstract class baseGate {
  options = {} as GateOptions;
  form = false as string | false;

  public setOptions(options = null as RouteLocationRaw | any) {
    this.options = options;
    return this;
  }

  fail() {
    if (
      this.options &&
      typeof this.options === "object" &&
      "routeData" in this.options &&
      this.options.routeData
    ) {
      return this.route();
    } else {
      return this.form;
    }
  }

  abstract handle(): Promise<RouteLocationRaw | false | string | undefined | void>;

  route(): RouteLocationRaw | false {
    if (this.form === false) {
      return this.form;
    }

    return {
      path: "/confirm/" + this.form,
    };
  }
}

export default baseGate;
