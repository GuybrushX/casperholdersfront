<template>
  <operation
    :amount="amount"
    :fee="bidFee"
    :loading-sign-and-deploy="loadingSignAndDeploy"
    :remaining-balance="remainingBalance"
    :send-deploy="sendDeploy"
    :type="type"
    icon="mdi-connection"
    submit-title="Withdraw bid"
    title="Withdraw bid"
  >
    <p class="text-body-1">
      Here's your validator : <a
      :href=validatorUrl
      target="_blank"
    >{{ signer.activeKey }}
      <v-icon x-small>mdi-open-in-new</v-icon>
    </a><br />
      <br />
      Actually there's a commission rate of {{ commission }}%. (Applies on the staking rewards only.)<br />
      Example : if your delegators receive 100 CSPR rewards from staking, you will receive {{ commission }} CSPR and
      they will
      get {{ 100 - commission }} CSPR.
    </p>
    <Amount
      :balance="validatorBalance"
      :fee="bidFee"
      :min="minBid"
      :value="amount"
      class="mb-4"
      @input="amount = $event"
    />
    <p>
      Withdraw bid operation fee : {{ bidFee }} CSPR<br />
      Balance : {{ balance }} CSPR<br />
      Validator bid : {{ validatorBalance }} CSPR
      <template v-if="loadingBalance">
        Loading balance ...
        <v-progress-circular
          class="ml-3"
          color="white"
          indeterminate
        ></v-progress-circular>
      </template>
      <br />
      Remaining funds after operation : {{ remainingBalance }} CSPR<br />
    </p>
    <v-alert
      v-if="errorBalance"
      class="mt-5"
      dense
      prominent
      type="error"
    >
      <v-row align="center">
        <v-col class="grow">
          {{ errorBalance.message }}
        </v-col>
        <v-col class="shrink">
          <v-btn
            v-if="isInstanceOfNoActiveKeyError"
            color="primary"
            @click="connectionRequest"
          >
            <v-icon left>mdi-account-circle</v-icon>
            Connect
          </v-btn>
        </v-col>
      </v-row>
    </v-alert>
    <v-alert
      v-if="errorDeploy"
      class="mt-5"
      dense
      type="error"
    >
      {{ errorDeploy.message }}
    </v-alert>
  </operation>
</template>

<script>
import Operation from "@/components/operations/Operation";
import Amount from "@/components/operations/Amount";
import {Signer} from "casper-js-sdk";
import {mapState} from "vuex";
import {WithdrawBidResult} from "@casperholders/core/dist/services/results/withdrawBidResult";
import {NoActiveKeyError} from "@casperholders/core/dist/services/errors/noActiveKeyError";
import {InsufficientFunds} from "@casperholders/core/dist/services/errors/insufficientFunds";
import {WithdrawBid} from "@casperholders/core/dist/services/deploys/auction/actions/withdrawBid";
/**
 * WithdrawBid view
 * Contains one fields
 * - Amount to withdraw to the bid of the validator
 */
export default {
    name: "WithdrawBid",
    components: {Amount, Operation},
    data() {
        return {
            minBid: 1,
            bidFee: 0.00001,
            amount: "1",
            balance: "0",
            validatorBalance: "0",
            commission: 0,
            errorBalance: null,
            loadingSignAndDeploy: false,
            errorDeploy: null,
            loadingBalance: false,
            type: WithdrawBidResult.getName()
        }
    },
    computed: {
        ...mapState([
            "signer",
        ]),
        remainingBalance() {
            let result = this.balance + this.amount - this.bidFee
            return Math.trunc(result) >= 0 ? Number(result.toFixed(5)) : 0
        },
        validatorUrl() {
            return this.$getCsprLiveUrl() + "validator/" + this.signer.activeKey;
        },
        minimumFundsNeeded() {
            return this.bidFee;
        },
        isInstanceOfNoActiveKeyError() {
            return this.errorBalance instanceof NoActiveKeyError
        }
    },
    watch: {
        async 'signer.activeKey'() {
            await this.getBalance()
        }
    },
    async mounted() {
        await this.getBalance();
        this.$root.$on("operationOnGoing", () => this.errorDeploy = null)
    },
    methods: {
        /**
         * Get the user balance and the validator balance
         */
        async getBalance() {
            this.loadingBalance = true;
            this.errorBalance = null;
            this.balance = "0";
            this.validatorBalance = "0";
            this.commission = 0;
            try {
                this.balance = await this.$getBalanceService().fetchBalance();
                const validatorInfos = await this.$getBalanceService().fetchValidatorBalance();
                this.validatorBalance = validatorInfos.balance;
                this.commission = validatorInfos.commission;
                if (this.balance <= this.minimumFundsNeeded) {
                    throw new InsufficientFunds(this.minimumFundsNeeded)
                }
            } catch (e) {
                this.errorBalance = e;
            }
            this.loadingBalance = false;
        },
        /**
         * Method used by the OperationDialog component when the user confirm the operation.
         * Use the prepareSignAndSendDeploy method from the core library
         * Update the store with a deploy result containing the deployhash of the deploy sent
         */
        async sendDeploy() {
            this.errorDeploy = null;
            this.loadingSignAndDeploy = true;
            try {
                const deployResult = await this.$getDeployManager().prepareSignAndSendDeploy(
                    new WithdrawBid(this.amount, this.signer.activeKey, this.$getNetwork(), this.$getAuctionHash()),
                    this.$getSigner(),
                    this.$getOptionsActiveKeyValidatorOperations()
                );
                await this.$store.dispatch("addDeployResult", deployResult)
            } catch (e) {
                this.errorDeploy = e;
            }
            this.loadingSignAndDeploy = false;
            this.$root.$emit('closeOperationDialog');
            this.$root.$emit('operationFinished');
        },
        connectionRequest() {
            Signer.sendConnectionRequest();
        },
    }
}
</script>

<style scoped>

</style>
