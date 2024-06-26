const express = require('express');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const blake2AsHex = require('@polkadot/util-crypto');
const { Buffer } = require('buffer');
const { createPublicKey, createHash } = require('crypto');
const { compactVerify } = require('jose/jws/compact/verify')

const cors = require('cors');
const { imageHash } = require('image-hash');

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

        const vc_proof = vc["proof"]; // VC proof not the VPC proof
        const vc_proof_value = vc_proof["proofValue"]; // JWS
        const verification_method = vc_proof["verificationMethod"]

        console.log('Verifing VC:', JSON.stringify(vc))
        console.log('DID URI: ', verification_method)


        const json = await new Promise((resolve, reject) => {
            api.query.didModule.dIDDocument(verification_method, (result) => {
                if (!result.isEmpty) {
                    resolve(JSON.parse(result.toString()));
                } else {
                    reject()
                }
            });
        }).catch((error) => {
            console.log('api.query.didModule.dIDDocument error ', error);
        })


        if (!json) return false;
        console.log('DID: ', JSON.stringify(json))

        const did_document_hex = json.did_document;
        const hex = did_document_hex.substr(2);

        const didJSON = JSON.parse(hexToUtf8(hex));

        const pk = didJSON["assertionMethod"][0]["publicKeyMultibase"];

        const { proof, ...rest } = vc;

        return await verify(vc_proof_value, pk, JSON.stringify({ ...rest }));

    } catch (error) {
        console.log(error)
        return false
    }

}

async function calImgHash(imageUri) {

    return new Promise((resolve, reject) => {
        imageHash(imageUri, 16, true, (error, data) => {
            if (error) throw error;
            resolve(data);
        });
    })

}

async function validateVerifiableCredential(api, vcs = []) {
    return Promise.all(vcs.map(async (vc) => {
        const valid = await verifyVC(api, vc);

        if (vc.type.includes("DigitalDriverLicenceCredential")) {
            return { ...vc.credentialSubject, valid, type: "DigitalDriverLicenceCredential" }
        } else if (vc.type.includes("DigitalDriverLicenceCredentialTrackback")) {
            return { ...vc.credentialSubject, valid, type: "DigitalDriverLicenceCredentialTrackback" }
        } else {
            return { ...vc.credentialSubject.passport.traveller, valid, type: "DigitalPassportCredential" }
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

        console.log('VCP: ', JSON.stringify(vcp))

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

        const vcpVerified = vcpVerfy(vcp);

        const vcs = vcp["verifiableCredential"];

        const validatedVCS = await validateVerifiableCredential(api, vcs);

        const hasImagUri = validatedVCS.find(a => a.type === "DigitalDriverLicenceCredentialTrackback" && !!a.imageUri);

        if (hasImagUri) {
            const hash = await calImgHash(hasImagUri.imageUri)
            validatedVCS.push({
                calculatedImageHash: hash,
                valid: true,
                type: "DigitalDriverLicenceCredentialTrackback"
            })
        }

        await api.disconnect().catch((error) => {
            console.log(error)
        });


        console.log('VCP VERIFIED: ', vcpVerified)
        console.log('VC RESULT: ', JSON.stringify(validatedVCS))

        const vcsVerified = validatedVCS.reduce((a, b) => {
            return a && b.valid;
        }, true);

        console.log('VC VERIFIED:', vcsVerified)

        vcpsReceived.push({ vcs: validatedVCS, datetime: new Date(), verfied: (vcpVerified && vcsVerified) });

        res.json({ result: { vc: validatedVCS, verfied: (vcpVerified && vcsVerified) } })

    } catch (error) {
        console.log(error)
        res.sendStatus(400);
    }


})


app.get('/api/v1/vcp/licenceRequest', (req, res) => {

    return res.json({
        schema: JSON.parse(fs.readFileSync('./resources/licence.schema.json')),
        publishUrl: "https://trackback-ta.trackback.dev/api/v1/vcp",
    })
});

app.get('/api/v1/vcp/passportRequest', (req, res) => {

    return res.json({
        schema: JSON.parse(fs.readFileSync('./resources/passport.schema.json')),
        publishUrl: "https://trackback-dia.trackback.dev/api/v1/vcp"
    });
})

app.get('/api/v1/vcp/trackbackLicenceRequest', (req, res) => {

    return res.json({
        schema: JSON.parse(fs.readFileSync('./resources/trackback.licence.schema.json')),
        publishUrl: "https://trackback-verifier.trackback.dev/api/v1/vcp"
    });
})

const server = app.listen(port, () => {
    console.log(`Demo verifier service running on port ${port}`);
});

console.log('SERVER STARTING');

process.on('uncaughtException', function (exception) {
    console.log(exception);

});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.log('HTTP server closed')
    })
});