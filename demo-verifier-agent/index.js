const express = require('express');
const { ApiPromise, WsProvider } = require('@polkadot/api');

const { Buffer } = require('buffer');
const { createPublicKey } = require('crypto');
const { compactVerify } = require('jose/jws/compact/verify')

const cors = require('cors');

const app = express();
const port = process.env.PORT || 80;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const convert = (from, to) => str => Buffer.from(str, from).toString(to);
const hexToUtf8 = convert('hex', 'utf8');

const vcpsReceived = [];
const currentlySharedClaims = {"shared": null};

async function verify(jws, publicKeyHex, payloadToVerify) {

    const publicKey = createPublicKey({
        'key': `-----BEGIN PUBLIC KEY-----\n${publicKeyHex}\n-----END PUBLIC KEY-----`,
        'format': 'pem',
        'type': 'spki',
    });

    const decoder = new TextDecoder()

    const { payload, protectedHeader } = await compactVerify(jws, publicKey)

    return (decoder.decode(payload) === payloadToVerify)

}

async function vcpVerfy(vcp) {
    const { proof, ...rest } = vcp;

    const result = await verify(
        vcp.proof.proofValue,
        vcp.proof.verificationMethod.split("#")[1],
        JSON.stringify({ ...rest })
    );

    return result;
}

app.get('/api/v1/vcp', (req, res) => {
    res.json(
        { 
            vcps: [...vcpsReceived],
            currentlySharedClaims: currentlySharedClaims
        }
    )
})

app.post('/api/v1/vcp', async (rq, res) => {

    const vcp = rq.body.vcp;

    const vcpVerified = await vcpVerfy(vcp);

    const vc = vcp["verifiableCredential"][0];

    let vc_proof = vc["proof"]; // VC proof not the VPC proof
    let vc_proof_value = vc_proof["proofValue"]; // JWS
    let verification_method = vc_proof["verificationMethod"].split(":")[2]; // DID URI

    const provider = new WsProvider("wss://trackback.dev");

    const types = {
        "VerifiableCredential": {
            "account_id": "AccountId",
            "public_key": "Vec<8>",
            "block_time_stamp": "u64",
            "active": "bool"
        },
        "DID": {
            "did_uri": "Vec<u8>",
            "did_document": "Vec<u8>",
            "block_number": "BlockNumber",
            "block_time_stamp": "u64",
            "did_ref": "Vec<u8>",
            "sender_account_id": "AccountId",
            "active": "Option<bool>"
        }
    };

    const rpc = {
        "didModule": {
            "dIDDocument": {
                "description": "Get DID Documnet",
                "params": [
                    {
                        "name": "didDocumentHash",
                        "type": "Vec<u8>"
                    }
                ],
                "type": "DID"
            }
        }
    };

    const api = await ApiPromise.create({ provider: provider, types, rpc });

    const json = await new Promise((resolve, reject) => {
        api.query.didModule.dIDDocument(verification_method, (result) => {
            if (!result.isEmpty) {
                resolve(JSON.parse(result.toString()));
            } else {
                reject()
            }
        });
    });

    const did_document_hex = json.did_document;
    const hex = did_document_hex.substr(2);

    const didJSON = JSON.parse(hexToUtf8(hex));

    let pk = didJSON["assertionMethod"][0]["publicKeyMultibase"];

    const { proof, ...rest } = vc;

    const vcVerified = await verify(vc_proof_value, pk, JSON.stringify({ ...rest }));

    let sharedVCP = vcp["verifiableCredential"][0]["credentialSubject"]["passport"]["traveller"];

    if (vcVerified && vcpVerified) {
        vcpsReceived.push(vcp);
        currentlySharedClaims["shared"] = sharedVCP;
     }

    let verification = {
        VcVerified: vcVerified,
        VcpVerified: vcpVerified,
        VCP: sharedVCP,
    };
    console.log(verification);
    res.json(verification);


})

app.listen(port, () => {
    console.log(`Demo verifier service running on port ${port}`);
});

console.log('SERVER STARTING');

process.on('uncaughtException', function (exception) {
    console.log(exception);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.log('HTTP server closed')
    })
});