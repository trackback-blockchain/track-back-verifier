const express = require('express');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { compactVerify } = require('jose/jws/compact/verify')
const { Buffer } = require('buffer');

const app = express();
const port = process.env.PORT || 80;




app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get('/',  async (rq, res)=> {

    // *****************************************************************************************************
    // Dummuy VC 
    let vc = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1"
        ],
        "type": "VerifiablePresentation",
        "verifiableCredential": [
            {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://trackback.co/identity/v1"
                ],
                "id": "something",
                "type": [
                    "VerifiableCredential",
                    "DigitalPassportCredential"
                ],
                "issuer": "did:trackback.dev:398a674da844a",
                "expires": "2028-01-01T00:00:00Z",
                "credentialSubject": {
                    "type": [
                        "DigitalPassport"
                    ],
                    "id": "https://wakanda/dia/001",
                    "passport": {
                        "id": "did:trackback.dev:2935f8f4d7fe7",
                        "type": "DigitalPassport",
                        "traveler": {
                            "givenName": "dpn",
                            "familyName": "plp",
                            "citizenship": "Wakanda"
                        }
                    }
                },
                "proof": {
                    "type": "Ed25519Signature2020",
                    "created": "2021-08-11T21:29:30.222Z",
                    "verificationMethod": "did:trackback.dev:0x2a674c8ef2bc79f13faf22d4165ac99efc2cabe6e3194c0a58336fed7c56b1b3",
                    "proofPurpose": "assertionMethod",
                    "proofValue": "eyJhbGciOiJFZERTQSJ9.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdHJhY2tiYWNrLmNvL2lkZW50aXR5L3YxIl0sImlkIjoic29tZXRoaW5nIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRpZ2l0YWxQYXNzcG9ydENyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOnRyYWNrYmFjay5kZXY6Mzk4YTY3NGRhODQ0YSIsImV4cGlyZXMiOiIyMDI4LTAxLTAxVDAwOjAwOjAwWiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7InR5cGUiOlsiRGlnaXRhbFBhc3Nwb3J0Il0sImlkIjoiaHR0cHM6Ly93YWthbmRhL2RpYS8wMDEiLCJwYXNzcG9ydCI6eyJpZCI6ImRpZDp0cmFja2JhY2suZGV2OjI5MzVmOGY0ZDdmZTciLCJ0eXBlIjoiRGlnaXRhbFBhc3Nwb3J0IiwidHJhdmVsZXIiOnsiZ2l2ZW5OYW1lIjoiZHBuIiwiZmFtaWx5TmFtZSI6InBscCIsImNpdGl6ZW5zaGlwIjoiV2FrYW5kYSJ9fX19.TtfOadumejC61NWPUqS_E6cLjWlXa8bJueoUiWpjzveuMu59yNRoYxlRUrrSEo_7LRRt5G-NejqPsQ2VA2aMCA"
                }
            }
        ],
        "proof": {
            "type": "Ed25519Signature2020",
            "created": "2021-08-11T21:29:30.222Z",
            "verificationMethod": "did:trackback.dev:41600ea3bf329#MCowBQYDK2VwAyEAvVjph2bILdU9YYKA2muSa7eEkisBO6eRBgbdXQt8ewc=",
            "proofPurpose": "assertionMethod",
            "proofValue": "eyJhbGciOiJFZERTQSJ9.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjoiVmVyaWZpYWJsZVByZXNlbnRhdGlvbiIsInZlcmlmaWFibGVDcmVkZW50aWFsIjpbeyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vdHJhY2tiYWNrLmNvL2lkZW50aXR5L3YxIl0sImlkIjoic29tZXRoaW5nIiwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIkRpZ2l0YWxQYXNzcG9ydENyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOnRyYWNrYmFjay5kZXY6Mzk4YTY3NGRhODQ0YSIsImV4cGlyZXMiOiIyMDI4LTAxLTAxVDAwOjAwOjAwWiIsImNyZWRlbnRpYWxTdWJqZWN0Ijp7InR5cGUiOlsiRGlnaXRhbFBhc3Nwb3J0Il0sImlkIjoiaHR0cHM6Ly93YWthbmRhL2RpYS8wMDEiLCJwYXNzcG9ydCI6eyJpZCI6ImRpZDp0cmFja2JhY2suZGV2OjI5MzVmOGY0ZDdmZTciLCJ0eXBlIjoiRGlnaXRhbFBhc3Nwb3J0IiwidHJhdmVsZXIiOnsiZ2l2ZW5OYW1lIjoiZHBuIiwiZmFtaWx5TmFtZSI6InBscCIsImNpdGl6ZW5zaGlwIjoiV2FrYW5kYSJ9fX0sInByb29mIjp7InR5cGUiOiJFZDI1NTE5U2lnbmF0dXJlMjAyMCIsImNyZWF0ZWQiOiIyMDIxLTA4LTExVDIxOjI5OjMwLjIyMloiLCJ2ZXJpZmljYXRpb25NZXRob2QiOiJkaWQ6dHJhY2tiYWNrLmRldjoweDJhNjc0YzhlZjJiYzc5ZjEzZmFmMjJkNDE2NWFjOTllZmMyY2FiZTZlMzE5NGMwYTU4MzM2ZmVkN2M1NmIxYjMiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJwcm9vZlZhbHVlIjoiZXlKaGJHY2lPaUpGWkVSVFFTSjkuZXlKQVkyOXVkR1Y0ZENJNld5Sm9kSFJ3Y3pvdkwzZDNkeTUzTXk1dmNtY3ZNakF4T0M5amNtVmtaVzUwYVdGc2N5OTJNU0lzSW1oMGRIQnpPaTh2ZEhKaFkydGlZV05yTG1OdkwybGtaVzUwYVhSNUwzWXhJbDBzSW1sa0lqb2ljMjl0WlhSb2FXNW5JaXdpZEhsd1pTSTZXeUpXWlhKcFptbGhZbXhsUTNKbFpHVnVkR2xoYkNJc0lrUnBaMmwwWVd4UVlYTnpjRzl5ZEVOeVpXUmxiblJwWVd3aVhTd2lhWE56ZFdWeUlqb2laR2xrT25SeVlXTnJZbUZqYXk1a1pYWTZNems0WVRZM05HUmhPRFEwWVNJc0ltVjRjR2x5WlhNaU9pSXlNREk0TFRBeExUQXhWREF3T2pBd09qQXdXaUlzSW1OeVpXUmxiblJwWVd4VGRXSnFaV04wSWpwN0luUjVjR1VpT2xzaVJHbG5hWFJoYkZCaGMzTndiM0owSWwwc0ltbGtJam9pYUhSMGNITTZMeTkzWVd0aGJtUmhMMlJwWVM4d01ERWlMQ0p3WVhOemNHOXlkQ0k2ZXlKcFpDSTZJbVJwWkRwMGNtRmphMkpoWTJzdVpHVjJPakk1TXpWbU9HWTBaRGRtWlRjaUxDSjBlWEJsSWpvaVJHbG5hWFJoYkZCaGMzTndiM0owSWl3aWRISmhkbVZzWlhJaU9uc2laMmwyWlc1T1lXMWxJam9pWkhCdUlpd2labUZ0YVd4NVRtRnRaU0k2SW5Cc2NDSXNJbU5wZEdsNlpXNXphR2x3SWpvaVYyRnJZVzVrWVNKOWZYMTkuVHRmT2FkdW1lakM2MU5XUFVxU19FNmNMaldsWGE4Ykp1ZW9VaVdwanp2ZXVNdTU5eU5Sb1l4bFJVcnJTRW9fN0xSUnQ1Ry1OZWpxUHNRMlZBMmFNQ0EifX1dLCJwcm9vZiI6e319.XqMf2QGqQVMHhPcjP_ZqfxIoaxwxBiNQhzXCXzCpwXf-t21eEyLV4eTmkd5nOXaXN5u7zYhvg8pMqZBpQM8ODQ"
        }
    };

    let vc_proof =  vc["verifiableCredential"][0]["proof"]; // VC proof not the VPC proof
    let vc_proof_value = vc_proof["proofValue"]; // JWS
    let verification_method = vc_proof["verificationMethod"].split(":")[2]; // DID URI
    // *****************************************************************************************************

    let did_document = {};
    let hash = "0x2a674c8ef2bc79f13faf22d4165ac99efc2cabe6e3194c0a58336fed7c56b1b3";
    const provider = new WsProvider("wss://trackback.dev");
    types = {
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
    let rpc = {
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
    // didJSON = {}
    api.query.didModule.dIDDocument(hash, (result) => {
        let didJSON = {};
        if (!result.isEmpty){
            let res = JSON.parse(result.toString());
            
            let owner = res["sender_account_id"].toString();
            let block_number = res["block_number"];
            did_document = res["did_document"];
            console.log(did_document);

        hex = did_document.substr(2);

        const convert = (from, to) => str => Buffer.from(str, from).toString(to);
        const hexToUtf8 = convert('hex', 'utf8');

        
        let str =  hexToUtf8(hex);
        
        console.log(str)
        // const myContext = await didParser.parse(str);

        didJSON = JSON.parse(str);
        let assetionMethodPublicKeymultibase = didJSON["assertionMethod"][0]["publicKeyMultibase"];

        console.log(assetionMethodPublicKeymultibase);

        } else {
            console.log("Error");
        }
        res.status = 200;

        res.json(didJSON);
      });

});

app.post('/api/v1/vcp', async (rq, res) => {

    let vc = rq.body.vcp;

    let vc_proof =  vc["verifiableCredential"][0]["proof"]; // VC proof not the VPC proof
    let vc_proof_value = vc_proof["proofValue"]; // JWS
    let verification_method = vc_proof["verificationMethod"].split(":")[2]; // DID URI
    let status = 400;
    let message = {"verification": false};
    // *****************************************************************************************************

    let did_document = {};
    // let hash = "0x2a674c8ef2bc79f13faf22d4165ac99efc2cabe6e3194c0a58336fed7c56b1b3";
    const provider = new WsProvider("wss://trackback.dev");
    types = {
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
    let rpc = {
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


    api.query.didModule.dIDDocument(verification_method, (result) => {
        let didJSON = {};
        if (!result.isEmpty){
            let res = JSON.parse(result.toString());
            
            let owner = res["sender_account_id"].toString();
            let block_number = res["block_number"];
            did_document = res["did_document"];

            console.log(did_document);

            hex = did_document.substr(2);

            const convert = (from, to) => str => Buffer.from(str, from).toString(to);
            const hexToUtf8 = convert('hex', 'utf8');

            
            let str =  hexToUtf8(hex);
            
            console.log(str)

            didJSON = JSON.parse(str);
            let pk = didJSON["assertionMethod"][0]["publicKeyMultibase"];

            console.log(pk);


            let buff = Buffer.from(pk);
            const arr = new Uint8Array(buff);
            
            console.log(arr);

            (async() => {
                const decoder = new TextDecoder();
                const jws = vc_proof_value;
                const { payload, protectedHeader } = await compactVerify(jws, arr);
    
                console.log(protectedHeader)
                console.log(decoder.decode(payload))
              })();

            // const decoder = new TextDecoder();
            // const jws = vc_proof_value;
            // const { payload, protectedHeader } = await compactVerify(jws, assetionMethodPublicKeymultibase);

            // console.log(protectedHeader)
            // console.log(decoder.decode(payload))

            status = 200;
            message = {"verification": true};
                

        }

        res.status = status;
        res.json(message);
    });

})

app.listen(port, ()=> {
    console.log(`Demo verifier service running on port ${port}`);
});