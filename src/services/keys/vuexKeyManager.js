import store from "@/store";
import {AbstractKeyManager} from "@casperholders/core/dist/services/keys/abstractKeyManager";
import {NoActiveKeyError} from "@casperholders/core/dist/services/errors/noActiveKeyError";

/**
 * VuexKeyManager class
 * Key Manager implementation for Vuex store
 * Your state must contain a signer object with the connected & activeKey property
 */
export class VuexKeyManager extends AbstractKeyManager {
    /**
     * Retrieve the current active key from the vuex store
     *
     * @return string - Return a public key hex
     */
    static get activeKey() {
        if (store.state.signer.connected && store.state.signer.activeKey) {
            return store.state.signer.activeKey;
        }

        throw new NoActiveKeyError();
    }
}