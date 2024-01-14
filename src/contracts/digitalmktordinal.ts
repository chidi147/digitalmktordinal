import {
    Addr,
    prop,
    method,
    Utils,
    hash256,
    assert,
    ContractTransaction,
    bsv,
    PubKey,
    hash160,
    Sig,
    SigHash,
} from 'scrypt-ts'
import { OrdiMethodCallOptions, OrdinalNFT } from 'scrypt-ord'

export class DigitalMktOrdinalNFT extends OrdinalNFT {
    @prop()
    seller: PubKey

    @prop()
    price: bigint

    constructor(seller: PubKey, price: bigint) {
        super()
        this.init(...arguments)
        this.seller = seller
        this.price = price
    }

    @method()
    public purchase(dest: Addr) {
        const outputs =
            Utils.buildAddressOutput(dest, 1n) + // ordinal to the buyer
            Utils.buildAddressOutput(hash160(this.seller), this.price) + // fund to the seller
            this.buildChangeOutput()
        assert(
            this.ctx.hashOutputs == hash256(outputs),
            'hashOutputs check failed'
        )
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public cancel(sig: Sig) {
        assert(this.checkSig(sig, this.seller), 'seller signature check failed')
        const outputs = Utils.buildAddressOutput(hash160(this.seller), 1n) // ordinal back to the seller
        assert(
            this.ctx.hashOutputs == hash256(outputs),
            'hashOutputs check failed'
        )
    }

    static async buildTxForPurchase(
        current: DigitalMktOrdinalNFT,
        options: OrdiMethodCallOptions<DigitalMktOrdinalNFT>,
        dest: Addr
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()
        const tx = new bsv.Transaction()
            .addInput(current.buildContractInput())
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildAddressScript(dest)
                    ),
                    satoshis: 1,
                })
            )
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildAddressScript(hash160(current.seller))
                    ),
                    satoshis: Number(current.price),
                })
            )
            .change(options.changeAddress || defaultAddress)
        return {
            tx,
            atInputIndex: 0,
            nexts: [],
        }
    }

    static async buildTxForCancel(
        current: DigitalMktOrdinalNFT,
        options: OrdiMethodCallOptions<DigitalMktOrdinalNFT>
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()
        const tx = new bsv.Transaction()
            .addInput(current.buildContractInput())
            .addOutput(
                new bsv.Transaction.Output({
                    script: bsv.Script.fromHex(
                        Utils.buildAddressScript(hash160(current.seller))
                    ),
                    satoshis: 1,
                })
            )
            .change(options.changeAddress || defaultAddress)
        return {
            tx,
            atInputIndex: 0,
            nexts: [],
        }
    }
}