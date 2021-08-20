const express = require('express');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

const { Buffer } = require('buffer');
const { createPublicKey, createHash } = require('crypto');
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

async function verify(jws, publicKeyHex, payloadToVerify) {

    const publicKey = createPublicKey({
        'key': `-----BEGIN PUBLIC KEY-----\n${publicKeyHex}\n-----END PUBLIC KEY-----`,
        'format': 'pem',
        'type': 'spki',
    });

    const decoder = new TextDecoder()

    const hash = createHash('sha256').update(payloadToVerify).digest('base64');

    const { payload, protectedHeader } = await compactVerify(jws, publicKey)

    return (decoder.decode(payload) === hash)

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


async function verifyVC(api, vc) {

    try {

        let vc_proof = vc["proof"]; // VC proof not the VPC proof
        let vc_proof_value = vc_proof["proofValue"]; // JWS
        let verification_method = vc_proof["verificationMethod"].split(":")[2]; // DID URI

        const json = await new Promise((resolve, reject) => {
            api.query.didModule.dIDDocument(verification_method, (result) => {
                if (!result.isEmpty) {
                    resolve(JSON.parse(result.toString()));
                } else {
                    reject()
                }
            });
        })

        const did_document_hex = json.did_document;
        const hex = did_document_hex.substr(2);

        const didJSON = JSON.parse(hexToUtf8(hex));

        let pk = didJSON["assertionMethod"][0]["publicKeyMultibase"];

        const { proof, ...rest } = vc;

        return await verify(vc_proof_value, pk, JSON.stringify({ ...rest }));

    } catch (error) {
        console.log(error)
        return false
    }

}

async function validateVerifiableCredential(api, vcs = []) {
    return Promise.all(vcs.map(async (vc) => {
        const valid = await verifyVC(api, vc);

        if (vc.type.includes("DigitalDriverLicenceCredential")) {
            return { ...vc.credentialSubject, valid, type: "DigitalDriverLicenceCredential" }
        } else {
            return { ...vc.credentialSubject.passport.traveller, valid, type: "DigitalPassportCredential"}
        }
    }))
}



app.get('/api/v1/verifiable_credentials', (req, res) => {
    res.json(
        {
            vcps: [...vcpsReceived]
        }
    )
})

app.get('/api/v1/vcp', (req, res) => {
    res.status = 400;
    res.json({ invalid: "Invalid Request" });
})

app.post('/api/v1/vcp', async (rq, res) => {

    try {

        const vcp = rq.body.vcp;

        const provider = new WsProvider("wss://trackback.dev");
        // const provider = new WsProvider("ws://127.0.0.1:9944");

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

        const vcpVerified = await vcpVerfy(vcp);

        const vcs = vcp["verifiableCredential"];

        const validatedVCS = await validateVerifiableCredential(api, vcs);

        console.log('VCP: ', JSON.stringify(vcp))

        console.log('VCP VERIFIED: ', vcpVerified)
        console.log('VC VERIFIED: ', JSON.stringify(validatedVCS))

        vcpsReceived.push({ vcs: validatedVCS, datetime: new Date(), vcpVerified: vcpVerified });

        res.json({ result: { vc: validatedVCS, vcpVerified: vcpVerified } })

    } catch (error) {
        console.log(error)
        res.sendStatus(400);
    }


})


app.get('/api/v1/vcp/licenceRequest', (req, res) => {

    return res.json({
        schema: JSON.parse(fs.readFileSync('./resources/licence.schema.json')),
        publishUrl: "https://trackback-ta.trackback.dev/api/v1/vcp"
    })
});

app.get('/api/v1/vcp/passportRequest', (req, res) => {

    return res.json({
        schema: JSON.parse(fs.readFileSync('./resources/passport.schema.json')),
        publishUrl: "https://trackback-dia.trackback.dev/api/v1/vcp"
    });
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