wallet_id: 2147483409
valid_until: 1746469177
seqno: 58
actions:
  - magic: "0xec3c86d"
    mode: 3
    msg:
      sum_type: MessageInternal
      message_internal:
        ihr_disabled: true
        bounce: true
        bounced: false
        src: ""
        dest: 0:b39d0fc87dc3b646633900d73474e873ec35c50411b712f11a085460c05faa14
        value:
          grams: "53232266"
          other: {}
        ihr_fee: "0"
        fwd_fee: "0"
        created_lt: 0
        created_at: 0
        init: null
        body:
          is_right: true
          value:
            sum_type: NftTransfer
            op_code: 1607220500
            value:
              query_id: "6083770390551305826"
              new_owner: 0:88661faccabc915076f619f82910503d691be3dca5b25a083cd67a0e8f261c6f
              response_destination: 0:88661faccabc915076f619f82910503d691be3dca5b25a083cd67a0e8f261c6f
              custom_payload: null
              forward_amount: "1"
              forward_payload:
                is_right: true
                value:
                  sum_type: TextComment
                  op_code: 0
                  value:
                    text: "344327511"
extended: null
signature: 69daa51ed86f6c44d6e19c317c1d379a83584688da9eec8432f115052b368511239acd59b0c29235a3592d541be3f9a49fbda1eb34d4052e24a1a4f16c24b60b# Compressed NFT Contract

The [Augmenting API](https://github.com/ton-community/compressed-nft-api) currently uses the `CollectionNew` variant.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

# License
[MIT](LICENSE)
