import { inject } from 'vue'

// You should import this key during the plugin install when calling the provide function
export const gatekeeperKey = Symbol.for("gateKeeper");

export const useGateKeeper = () => {
    return inject(gatekeeperKey);
};